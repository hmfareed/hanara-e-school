const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Class = require('../models/Class');
const SchoolProfile = require('../models/SchoolProfile');
const { generatePayslipPdf } = require('../services/pdf.service');
const logger = require('../utils/logger');

// GET /api/payroll (Fetch payroll entries & stats for a given month YYYY-MM)
const getPayrolls = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const rawPayrolls = await Payroll.find({ month }).populate('staff', 'firstName lastName email role phone baseSalary branch photoUrl');
    const payrolls = rawPayrolls.filter((p) => p.staff && p.staff.firstName);

    const totalBasic = payrolls.reduce((acc, p) => acc + (p.basicSalary || 0), 0);
    const totalAllowances = payrolls.reduce((acc, p) => acc + (p.grossSalary - p.basicSalary || 0), 0);
    const totalDeductions = payrolls.reduce((acc, p) => acc + (p.grossSalary - p.netSalary || 0), 0);
    const totalNet = payrolls.reduce((acc, p) => acc + (p.netSalary || 0), 0);

    res.json({
      success: true,
      data: {
        month,
        payrolls,
        summary: {
          staffCount: payrolls.length,
          totalBasic,
          totalAllowances,
          totalDeductions,
          totalNet,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payroll/generate (Auto-generate monthly draft payroll for all active staff)
const generateMonthlyPayroll = async (req, res, next) => {
  try {
    const month = req.body.month || new Date().toISOString().slice(0, 7);

    // Clean up any legacy orphaned payroll entries where staff does not exist in Staff collection
    const existingForMonth = await Payroll.find({ month });
    for (const p of existingForMonth) {
      const exists = await Staff.exists({ _id: p.staff });
      if (!exists) {
        await Payroll.deleteOne({ _id: p._id });
      }
    }

    // Fetch all active staff from the Staff collection
    const activeStaff = await Staff.find({
      employmentStatus: 'active',
      firstName: { $nin: ['', null] },
    });

    // Fetch all form teachers / class teachers to give form teacher allowance automatically
    const classes = await Class.find({
      $or: [
        { formTeacher: { $ne: null } },
        { classTeacher: { $ne: null } }
      ]
    });
    const formTeacherMap = new Set();
    classes.forEach((c) => {
      if (c.formTeacher) formTeacherMap.add(c.formTeacher.toString());
      if (c.classTeacher) formTeacherMap.add(c.classTeacher.toString());
    });

    let createdCount = 0;

    for (const staff of activeStaff) {
      const existing = await Payroll.findOne({ staff: staff._id, month });
      if (existing) continue;

      const isFormTeacher = formTeacherMap.has(staff._id.toString());
      const formTeacherAllowance = isFormTeacher ? 150 : 0; // 150 GHS default form teacher allowance

      // Fetch configured base salary from Staff model or role default
      let configuredBaseSalary = Number(staff.baseSalary) || 0;
      if (configuredBaseSalary <= 0) {
        switch (staff.role) {
          case 'accountant':
          case 'admin':
            configuredBaseSalary = 2500;
            break;
          case 'teacher':
            configuredBaseSalary = 1800;
            break;
          case 'driver':
            configuredBaseSalary = 1500;
            break;
          case 'support':
          case 'cleaner':
            configuredBaseSalary = 1200;
            break;
          default:
            configuredBaseSalary = 1800;
        }
      }

      const payroll = new Payroll({
        staff: staff._id,
        month,
        basicSalary: configuredBaseSalary,
        allowances: {
          formTeacher: formTeacherAllowance,
          transport: staff.role === 'driver' ? 150 : 100,
          responsibility: isFormTeacher ? 50 : 0,
          bonus: 0,
        },
        deductions: {
          taxSSNIT: Math.round(configuredBaseSalary * 0.055) || 120,
          attendanceAbsence: 0,
          loans: 0,
          other: 0,
        },
        status: 'draft',
        createdBy: req.user?.id,
      });

      await payroll.save();
      createdCount++;
    }

    res.json({
      success: true,
      message: `Generated ${createdCount} payroll records for ${month}.`,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/payroll/:id (Update single staff payroll entry)
const updatePayrollItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { basicSalary, allowances, deductions, paymentMethod, remarks, status } = req.body;

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    if (basicSalary !== undefined) payroll.basicSalary = basicSalary;
    if (allowances) payroll.allowances = { ...payroll.allowances.toObject(), ...allowances };
    if (deductions) payroll.deductions = { ...payroll.deductions.toObject(), ...deductions };
    if (paymentMethod) payroll.paymentMethod = paymentMethod;
    if (remarks !== undefined) payroll.remarks = remarks;
    if (status) payroll.status = status;

    await payroll.save();

    res.json({
      success: true,
      message: 'Payroll record updated successfully',
      data: payroll,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payroll/approve (Bulk approve & mark payroll as paid)
const approveMonthlyPayroll = async (req, res, next) => {
  try {
    const { month, targetStatus } = req.body; // targetStatus: 'approved' or 'paid'
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    const statusToSet = targetStatus || 'paid';
    const updateData = { status: statusToSet };
    if (statusToSet === 'paid') {
      updateData.paymentDate = new Date();
    }

    const result = await Payroll.updateMany({ month }, { $set: updateData });

    res.json({
      success: true,
      message: `Successfully set ${result.modifiedCount || result.nModified || 0} payroll entries to ${statusToSet}.`,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payroll/payslip/:id/pdf (Download staff payslip PDF)
const getPayslipPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findById(id).populate('staff', 'firstName lastName email role phone baseSalary branch photoUrl');
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    const schoolProfile = await SchoolProfile.findOne({});
    const pdfBuffer = await generatePayslipPdf({ payroll, schoolProfile });

    const safeName = `Payslip_${payroll.staff?.firstName || 'Staff'}_${payroll.month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/payroll/month/:month (Delete entire monthly payroll)
const deleteMonthlyPayroll = async (req, res, next) => {
  try {
    const month = req.params.month || req.query.month;
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month parameter is required' });
    }

    const result = await Payroll.deleteMany({ month });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} payroll records for ${month}.`,
      data: { month, deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/payroll/:id (Delete single staff payroll entry)
const deletePayrollItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Payroll.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }
    res.json({
      success: true,
      message: 'Payroll record deleted successfully',
      data: { _id: id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayrolls,
  generateMonthlyPayroll,
  updatePayrollItem,
  approveMonthlyPayroll,
  getPayslipPdf,
  deleteMonthlyPayroll,
  deletePayrollItem,
};

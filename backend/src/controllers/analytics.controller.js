const Payment = require('../models/Payment');
const FeeCollectionSubmission = require('../models/FeeCollectionSubmission');
const StoreSale = require('../models/StoreSale');
const AttendanceRecord = require('../models/AttendanceRecord');
const Grade = require('../models/Grade');
const Invoice = require('../models/Invoice');
const Class = require('../models/Class');

// GET /api/analytics/executive-summary
const getExecutiveSummary = async (req, res, next) => {
  try {
    // 1. Fee Invoices Revenue Total
    const invoicePayments = await Payment.aggregate([
      { $match: { status: 'successful' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const invoiceTotal = invoicePayments[0]?.total || 0;

    // 2. Daily Fee Collections Revenue Total (Feeding & Bus Fares)
    const dailyFeeCollections = await FeeCollectionSubmission.aggregate([
      { $match: { status: { $ne: 'discrepancy_flagged' } } },
      {
        $group: {
          _id: null,
          feedingTotal: { $sum: '$totals.feedingTotal' },
          busFareTotal: { $sum: '$totals.busFareTotal' },
          grandTotal: { $sum: '$totals.grandTotal' },
        },
      },
    ]);
    const dailyFeeTotal = dailyFeeCollections[0]?.grandTotal || 0;
    const feedingTotal = dailyFeeCollections[0]?.feedingTotal || 0;
    const busFareTotal = dailyFeeCollections[0]?.busFareTotal || 0;

    // 3. School Store Sales Total
    const storeSales = await StoreSale.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const storeTotal = storeSales[0]?.total || 0;

    const grandRevenue = invoiceTotal + dailyFeeTotal + storeTotal;

    // 4. Overall Attendance Rates
    const totalAttendance = await AttendanceRecord.countDocuments({});
    const presentCount = await AttendanceRecord.countDocuments({ status: { $in: ['present', 'late'] } });
    const attendanceRate = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : '100.0';

    // 5. Invoice Debtor Balance Summary
    const invoiceBalance = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          totalBalance: { $sum: '$balance' },
        },
      },
    ]);
    const totalBilled = invoiceBalance[0]?.totalBilled || 0;
    const totalPaidInvoices = invoiceBalance[0]?.totalPaid || 0;
    const totalOutstanding = invoiceBalance[0]?.totalBalance || 0;

    // 6. Academic Pass / Grade Distribution (Grades 1-3 High, 4-6 Average, 7-9 Low)
    const totalGradesCount = await Grade.countDocuments({});
    const highGradesCount = await Grade.countDocuments({ totalScore: { $gte: 65 } });
    const avgGradesCount = await Grade.countDocuments({ totalScore: { $gte: 50, $lt: 65 } });
    const lowGradesCount = await Grade.countDocuments({ totalScore: { $lt: 50 } });

    res.json({
      success: true,
      data: {
        revenue: {
          grandRevenue,
          invoiceTotal,
          dailyFeeTotal,
          feedingTotal,
          busFareTotal,
          storeTotal,
        },
        financialSummary: {
          totalBilled,
          totalPaidInvoices,
          totalOutstanding,
          collectionRate: totalBilled > 0 ? ((totalPaidInvoices / totalBilled) * 100).toFixed(1) : '100.0',
        },
        attendance: {
          attendanceRate,
          totalRecords: totalAttendance,
          presentCount,
        },
        academics: {
          totalGradesCount,
          highGradesCount,
          avgGradesCount,
          lowGradesCount,
          passRate: totalGradesCount > 0 ? (((highGradesCount + avgGradesCount) / totalGradesCount) * 100).toFixed(1) : '100.0',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getExecutiveSummary };

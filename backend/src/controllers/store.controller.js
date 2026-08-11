const StoreItem = require('../models/StoreItem');
const StoreSale = require('../models/StoreSale');
const SchoolProfile = require('../models/SchoolProfile');
const { generateStoreReceiptPdf } = require('../services/pdf.service');

// GET /api/store/items (Fetch inventory items)
const getStoreItems = async (req, res, next) => {
  try {
    const items = await StoreItem.find({}).sort({ category: 1, name: 1 });
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// POST /api/store/items (Add new store item)
const createStoreItem = async (req, res, next) => {
  try {
    const { name, category, unitPrice, quantityInStock, reorderLevel, description } = req.body;
    if (!name || unitPrice === undefined) {
      return res.status(400).json({ success: false, message: 'Name and unit price are required' });
    }

    const item = new StoreItem({
      name,
      category,
      unitPrice,
      quantityInStock: quantityInStock || 0,
      reorderLevel: reorderLevel || 5,
      description: description || '',
    });

    await item.save();
    res.status(201).json({ success: true, message: 'Store item added to inventory', data: item });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/store/items/:id (Update store item / Restock)
const updateStoreItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, unitPrice, quantityInStock, reorderLevel, description } = req.body;

    const item = await StoreItem.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Store item not found' });
    }

    if (name) item.name = name;
    if (category) item.category = category;
    if (unitPrice !== undefined) item.unitPrice = unitPrice;
    if (quantityInStock !== undefined) item.quantityInStock = quantityInStock;
    if (reorderLevel !== undefined) item.reorderLevel = reorderLevel;
    if (description !== undefined) item.description = description;

    await item.save();
    res.json({ success: true, message: 'Store item updated successfully', data: item });
  } catch (error) {
    next(error);
  }
};

// POST /api/store/sales (Record POS store sale & update inventory stock)
const recordStoreSale = async (req, res, next) => {
  try {
    const { buyerName, studentId, items, paymentMethod } = req.body;

    if (!buyerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Buyer name and at least one item are required' });
    }

    let totalAmount = 0;
    const saleItems = [];

    // Verify stock availability and process line items
    for (const line of items) {
      const storeItem = await StoreItem.findById(line.itemId);
      if (!storeItem) {
        return res.status(404).json({ success: false, message: `Item ID ${line.itemId} not found` });
      }

      const qty = Number(line.quantity) || 1;
      if (storeItem.quantityInStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${storeItem.name}". In stock: ${storeItem.quantityInStock}, requested: ${qty}`,
        });
      }

      // Decrement stock
      storeItem.quantityInStock -= qty;
      await storeItem.save();

      const lineTotal = storeItem.unitPrice * qty;
      totalAmount += lineTotal;

      saleItems.push({
        item: storeItem._id,
        name: storeItem.name,
        quantity: qty,
        unitPrice: storeItem.unitPrice,
        totalPrice: lineTotal,
      });
    }

    // Generate unique receipt number
    const receiptNumber = `STR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const sale = new StoreSale({
      receiptNumber,
      student: studentId || null,
      buyerName,
      items: saleItems,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      soldBy: req.user.id,
    });

    await sale.save();

    res.status(201).json({
      success: true,
      message: `Sale completed! Receipt ${receiptNumber}`,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/store/sales (Fetch POS sales history)
const getStoreSales = async (req, res, next) => {
  try {
    const sales = await StoreSale.find({})
      .populate('student', 'firstName lastName admissionNumber')
      .populate('soldBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(100);

    const totalRevenue = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    res.json({
      success: true,
      data: {
        sales,
        summary: {
          totalSalesCount: sales.length,
          totalRevenue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/store/sales/:id/receipt/pdf (Download Store Sales Receipt PDF)
const getStoreReceiptPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await StoreSale.findById(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale record not found' });
    }

    const schoolProfile = await SchoolProfile.findOne({});
    const pdfBuffer = await generateStoreReceiptPdf({ sale, schoolProfile });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receipt_${sale.receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStoreItems,
  createStoreItem,
  updateStoreItem,
  recordStoreSale,
  getStoreSales,
  getStoreReceiptPdf,
};

const Batch = require('../models/Batch');
const Log = require('../models/Log');

// Get all batches
exports.getAllBatches = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId, silkType } = req.query;

    const query = {};
    if (status) query.status = status;
    if (userId) query.user = userId;
    if (silkType) query.silkType = silkType;

    // If not admin, only show user's own batches
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    const batches = await Batch.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Batch.countDocuments(query);

    res.status(200).json({
      success: true,
      count: batches.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      batches
    });
  } catch (error) {
    console.error('Get all batches error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get batch by ID
exports.getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('user', 'name email phone');

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Batch not found' 
      });
    }

    // Check if user owns the batch or is admin
    if (req.user.role !== 'admin' && batch.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.status(200).json({
      success: true,
      batch
    });
  } catch (error) {
    console.error('Get batch by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Create new batch
exports.createBatch = async (req, res) => {
  try {
    const {
      batchNumber,
      silkType,
      variety,
      quantity,
      productionDate,
      harvestDate,
      qualityGrade,
      moistureContent,
      filamentLength,
      denier,
      location,
      storageConditions,
      notes
    } = req.body;

    const batch = await Batch.create({
      user: req.user._id,
      batchNumber,
      silkType,
      variety,
      quantity,
      productionDate,
      harvestDate,
      qualityGrade,
      moistureContent,
      filamentLength,
      denier,
      location,
      storageConditions,
      notes
    });

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'create_batch',
      entity: 'Batch',
      entityId: batch._id,
      details: { batchNumber, silkType },
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      batch
    });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during batch creation',
      error: error.message 
    });
  }
};

// Update batch
exports.updateBatch = async (req, res) => {
  try {
    let batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Batch not found' 
      });
    }

    // Check if user owns the batch or is admin
    if (req.user.role !== 'admin' && batch.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const {
      status,
      harvestDate,
      qualityGrade,
      moistureContent,
      filamentLength,
      denier,
      location,
      storageConditions,
      marketRate,
      estimatedValue,
      actualSalePrice,
      saleDate,
      buyer,
      notes
    } = req.body;

    if (status) batch.status = status;
    if (harvestDate) batch.harvestDate = harvestDate;
    if (qualityGrade) batch.qualityGrade = qualityGrade;
    if (moistureContent) batch.moistureContent = moistureContent;
    if (filamentLength) batch.filamentLength = filamentLength;
    if (denier) batch.denier = denier;
    if (location) batch.location = location;
    if (storageConditions) batch.storageConditions = { ...batch.storageConditions, ...storageConditions };
    if (marketRate) batch.marketRate = marketRate;
    if (estimatedValue) batch.estimatedValue = estimatedValue;
    if (actualSalePrice) batch.actualSalePrice = actualSalePrice;
    if (saleDate) batch.saleDate = saleDate;
    if (buyer) batch.buyer = buyer;
    if (notes) batch.notes = notes;

    batch.updatedAt = Date.now();
    await batch.save();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'update_batch',
      entity: 'Batch',
      entityId: batch._id,
      details: { updatedFields: Object.keys(req.body) },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      batch
    });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during batch update',
      error: error.message 
    });
  }
};

// Delete batch
exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Batch not found' 
      });
    }

    // Check if user owns the batch or is admin
    if (req.user.role !== 'admin' && batch.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await batch.deleteOne();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'delete_batch',
      entity: 'Batch',
      entityId: batch._id,
      details: { batchNumber: batch.batchNumber },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during batch deletion',
      error: error.message 
    });
  }
};

// Get batch statistics
exports.getBatchStats = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };

    const totalBatches = await Batch.countDocuments(query);
    const inProduction = await Batch.countDocuments({ ...query, status: 'in_production' });
    const harvested = await Batch.countDocuments({ ...query, status: 'harvested' });
    const processed = await Batch.countDocuments({ ...query, status: 'processed' });
    const sold = await Batch.countDocuments({ ...query, status: 'sold' });

    const recentBatches = await Batch.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        total: totalBatches,
        inProduction,
        harvested,
        processed,
        sold
      },
      recentBatches
    });
  } catch (error) {
    console.error('Get batch stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

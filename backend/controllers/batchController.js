import Batch from '../models/Batch.js';
import mongoose from 'mongoose';

export const createBatch = async (req, res, next) => {
  try {
    const { userId, date, totalKg, wasteKg, doubles, notes } = req.body;

    const batch = new Batch({
      userId,
      date,
      totalKg,
      wasteKg,
      doubles,
      notes
    });

    await batch.save();
    res.status(201).json(batch);
  } catch (error) {
    next(error);
  }
};

export const getUserBatches = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batches = await Batch.find({ userId: id }).sort({ date: -1 });

    const totalKgResult = await Batch.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, totalKg: { $sum: '$totalKg' } } }
    ]);

    const totalKg = totalKgResult.length > 0 ? totalKgResult[0].totalKg : 0;

    res.status(200).json({ batches, totalKg });
  } catch (error) {
    next(error);
  }
};

export const getAllBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find()
      .populate('userId', 'name')
      .sort({ date: -1 });
    res.status(200).json(batches);
  } catch (error) {
    next(error);
  }
};

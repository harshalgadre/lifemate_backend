/**
 * Job Embedding Pipeline
 * Feature 4: Semantic Job Search (RAG)
 *
 * This service handles:
 * 1. Generating and storing embeddings for job documents
 * 2. Batch re-indexing all existing jobs
 * 3. Called automatically when a job is created/updated
 */

const mongoose = require('mongoose');
const { embedText, buildJobEmbeddingText } = require('./embeddingConfig');

/**
 * Generate and store an embedding for a single job document
 * Updates the job document in-place with the embedding field
 *
 * @param {string|ObjectId} jobId - MongoDB ObjectId of the job
 * @returns {Promise<{ success: boolean, jobId: string, dimensions: number }>}
 */
const embedJob = async (jobId) => {
  const collection = mongoose.connection.collection('jobs');

  // Fetch the job
  const { ObjectId } = mongoose.Types;
  const job = await collection.findOne({ _id: new ObjectId(jobId.toString()) });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Build the text document to embed
  const textToEmbed = buildJobEmbeddingText(job);

  // Generate the embedding
  const embedding = await embedText(textToEmbed);

  // Store back in MongoDB
  await collection.updateOne(
    { _id: job._id },
    {
      $set: {
        embedding,
        embeddingUpdatedAt: new Date(),
      },
    }
  );

  return {
    success: true,
    jobId: job._id.toString(),
    dimensions: embedding.length,
  };
};

/**
 * Batch index all Active jobs that don't have embeddings yet
 * Run this once to bootstrap the vector search index
 *
 * @param {Object} options
 * @param {number} [options.batchSize=10] - Jobs to process concurrently
 * @param {boolean} [options.reindexAll=false] - Re-embed ALL jobs (not just missing ones)
 * @returns {Promise<{ processed: number, failed: number, skipped: number }>}
 */
const batchIndexJobs = async (options = {}) => {
  const { batchSize = 5, reindexAll = false } = options;
  const collection = mongoose.connection.collection('jobs');

  // Find jobs that need indexing
  const query = reindexAll
    ? { status: 'Active' }
    : { status: 'Active', embedding: { $exists: false } };

  const jobs = await collection.find(query, { projection: { _id: 1 } }).toArray();

  console.log(`📦 Batch embedding: ${jobs.length} jobs to process...`);

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches to avoid memory overload
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (job) => {
        try {
          await embedJob(job._id);
          processed++;
          if (processed % 10 === 0) {
            console.log(`  ✅ Processed ${processed}/${jobs.length} jobs`);
          }
        } catch (err) {
          failed++;
          console.warn(`  ❌ Failed to embed job ${job._id}: ${err.message}`);
        }
      })
    );

    // Small delay between batches to be respectful of system resources
    if (i + batchSize < jobs.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`✅ Batch embedding complete: ${processed} processed, ${failed} failed, ${skipped} skipped`);

  return { processed, failed, skipped };
};

/**
 * Remove the embedding from a job (e.g., when job is closed/archived)
 * @param {string|ObjectId} jobId
 */
const removeJobEmbedding = async (jobId) => {
  const collection = mongoose.connection.collection('jobs');
  const { ObjectId } = mongoose.Types;

  await collection.updateOne(
    { _id: new ObjectId(jobId.toString()) },
    { $unset: { embedding: '', embeddingUpdatedAt: '' } }
  );
};

/**
 * Get embedding statistics for the jobs collection
 * @returns {Promise<{ total: number, indexed: number, unindexed: number }>}
 */
const getEmbeddingStats = async () => {
  const collection = mongoose.connection.collection('jobs');

  const [total, indexed] = await Promise.all([
    collection.countDocuments({ status: 'Active' }),
    collection.countDocuments({ status: 'Active', embedding: { $exists: true } }),
  ]);

  return {
    total,
    indexed,
    unindexed: total - indexed,
    percentIndexed: total > 0 ? Math.round((indexed / total) * 100) : 0,
  };
};

module.exports = {
  embedJob,
  batchIndexJobs,
  removeJobEmbedding,
  getEmbeddingStats,
};

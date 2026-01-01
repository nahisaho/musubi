/**
 * Traceability Module
 *
 * Requirement: IMP-6.2-004
 */

const { TraceabilityExtractor } = require('./extractor');
const { GapDetector } = require('./gap-detector');
const { MatrixStorage } = require('./matrix-storage');

module.exports = {
  TraceabilityExtractor,
  GapDetector,
  MatrixStorage,
};

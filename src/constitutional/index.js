/**
 * Constitutional Module
 *
 * Requirement: IMP-6.2-005, IMP-6.2-007
 */

const { ConstitutionalChecker, ARTICLES, SEVERITY } = require('./checker');
const { PhaseMinusOneGate, GATE_STATUS } = require('./phase-minus-one');
const { SteeringSync } = require('./steering-sync');
const { CIReporter, OUTPUT_FORMAT, EXIT_CODE } = require('./ci-reporter');

module.exports = {
  ConstitutionalChecker,
  PhaseMinusOneGate,
  SteeringSync,
  CIReporter,
  ARTICLES,
  SEVERITY,
  GATE_STATUS,
  OUTPUT_FORMAT,
  EXIT_CODE,
};

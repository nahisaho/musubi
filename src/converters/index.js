/**
 * Converters Module
 * 
 * Cross-format conversion between MUSUBI and Spec Kit
 */

'use strict';

const { parseMusubiProject } = require('./parsers/musubi-parser');
const { parseSpeckitProject } = require('./parsers/speckit-parser');
const { parseOpenAPISpec } = require('./parsers/openapi-parser');
const { writeMusubiProject } = require('./writers/musubi-writer');
const { writeSpeckitProject } = require('./writers/speckit-writer');
const irTypes = require('./ir/types');

/**
 * Convert a Spec Kit project to MUSUBI format
 * @param {string} sourcePath - Path to Spec Kit project
 * @param {Object} options - Conversion options
 * @returns {Promise<{filesConverted: number, warnings: string[], outputPath: string}>}
 */
async function convertFromSpeckit(sourcePath, options = {}) {
  const { output = '.', dryRun = false, force = false, verbose = false, preserveRaw = false } = options;
  
  if (verbose) console.log(`Converting Spec Kit project from: ${sourcePath}`);
  
  // Parse Spec Kit project to IR
  const ir = await parseSpeckitProject(sourcePath);
  
  if (verbose) {
    console.log(`  Found ${ir.features.length} features`);
    console.log(`  Found ${ir.constitution.articles.length} constitution articles`);
  }
  
  // Write to MUSUBI format
  const result = await writeMusubiProject(ir, output, { dryRun, force, preserveRaw, verbose });
  
  return {
    filesConverted: result.filesWritten,
    warnings: result.warnings,
    outputPath: output,
  };
}

/**
 * Convert a MUSUBI project to Spec Kit format
 * @param {Object} options - Conversion options
 * @returns {Promise<{filesConverted: number, warnings: string[], outputPath: string}>}
 */
async function convertToSpeckit(options = {}) {
  const { 
    source = '.', 
    output = './.specify', 
    dryRun = false, 
    force = false, 
    verbose = false, 
    preserveRaw = false 
  } = options;
  
  if (verbose) console.log(`Converting MUSUBI project to Spec Kit format`);
  
  // Parse MUSUBI project to IR
  const ir = await parseMusubiProject(source);
  
  if (verbose) {
    console.log(`  Found ${ir.features.length} features`);
    console.log(`  Found ${ir.constitution.articles.length} constitution articles`);
  }
  
  // Write to Spec Kit format
  const result = await writeSpeckitProject(ir, output.replace('/.specify', ''), { dryRun, force, preserveRaw, verbose });
  
  return {
    filesConverted: result.filesWritten,
    warnings: result.warnings,
    outputPath: output,
  };
}

/**
 * Validate a project format
 * @param {string} format - 'speckit' or 'musubi'
 * @param {string} projectPath - Path to project
 * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
 */
async function validateFormat(format, projectPath) {
  const errors = [];
  const warnings = [];
  
  try {
    if (format === 'speckit') {
      await parseSpeckitProject(projectPath);
    } else if (format === 'musubi') {
      await parseMusubiProject(projectPath);
    } else {
      errors.push(`Unknown format: ${format}. Use 'speckit' or 'musubi'.`);
    }
  } catch (error) {
    errors.push(error.message);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Test roundtrip conversion (A → B → A')
 * @param {string} projectPath - Path to project
 * @param {Object} options - Test options
 * @returns {Promise<{passed: boolean, similarity: number, differences: string[]}>}
 */
async function testRoundtrip(projectPath, options = {}) {
  const { verbose = false } = options;
  const differences = [];
  
  try {
    // Detect format
    const fs = require('fs-extra');
    const path = require('path');
    
    const isSpeckit = await fs.pathExists(path.join(projectPath, '.specify'));
    const isMusubi = await fs.pathExists(path.join(projectPath, 'steering'));
    
    if (!isSpeckit && !isMusubi) {
      return {
        passed: false,
        similarity: 0,
        differences: ['Could not detect project format (neither .specify nor steering directory found)'],
      };
    }
    
    if (verbose) {
      console.log(`Detected format: ${isSpeckit ? 'Spec Kit' : 'MUSUBI'}`);
    }
    
    // Parse original
    const originalIR = isSpeckit 
      ? await parseSpeckitProject(projectPath)
      : await parseMusubiProject(projectPath);
    
    // Convert to other format (in memory)
    const tempDir = path.join(projectPath, '.roundtrip-temp');
    await fs.ensureDir(tempDir);
    
    try {
      // Write to other format
      if (isSpeckit) {
        await writeMusubiProject(originalIR, tempDir, { force: true });
      } else {
        await writeSpeckitProject(originalIR, tempDir, { force: true });
      }
      
      // Parse converted
      const convertedIR = isSpeckit
        ? await parseMusubiProject(tempDir)
        : await parseSpeckitProject(tempDir);
      
      // Write back to original format
      const tempDir2 = path.join(projectPath, '.roundtrip-temp2');
      await fs.ensureDir(tempDir2);
      
      if (isSpeckit) {
        await writeSpeckitProject(convertedIR, tempDir2, { force: true });
      } else {
        await writeMusubiProject(convertedIR, tempDir2, { force: true });
      }
      
      // Parse roundtrip result
      const roundtripIR = isSpeckit
        ? await parseSpeckitProject(tempDir2)
        : await parseMusubiProject(tempDir2);
      
      // Compare
      const similarity = compareIR(originalIR, roundtripIR, differences);
      
      // Cleanup
      await fs.remove(tempDir);
      await fs.remove(tempDir2);
      
      return {
        passed: similarity >= 90,
        similarity,
        differences,
      };
    } finally {
      // Ensure cleanup
      await fs.remove(tempDir).catch(() => {});
      await fs.remove(path.join(projectPath, '.roundtrip-temp2')).catch(() => {});
    }
  } catch (error) {
    return {
      passed: false,
      similarity: 0,
      differences: [`Roundtrip test error: ${error.message}`],
    };
  }
}

/**
 * Convert OpenAPI/Swagger specification to MUSUBI format
 * @param {string} specPath - Path to OpenAPI spec (JSON or YAML)
 * @param {Object} options - Conversion options
 * @returns {Promise<{featuresCreated: number, requirementsCreated: number, warnings: string[], outputPath: string}>}
 */
async function convertFromOpenAPI(specPath, options = {}) {
  const { output = '.', dryRun = false, force = false, verbose = false, featureName: _featureName } = options;
  
  if (verbose) console.log(`Converting OpenAPI spec from: ${specPath}`);
  
  // Parse OpenAPI spec to IR
  const ir = await parseOpenAPISpec(specPath);
  
  // Count requirements
  let requirementsCreated = 0;
  for (const feature of ir.features) {
    requirementsCreated += feature.requirements?.length || 0;
  }
  
  if (verbose) {
    console.log(`  Found ${ir.features.length} features`);
    console.log(`  Found ${requirementsCreated} requirements`);
  }
  
  // Write to MUSUBI format
  const result = await writeMusubiProject(ir, output, { dryRun, force, verbose });
  
  return {
    featuresCreated: ir.features.length,
    requirementsCreated,
    warnings: result.warnings,
    outputPath: output,
  };
}

/**
 * Compare two IR structures and return similarity percentage
 * @param {import('./ir/types').ProjectIR} original 
 * @param {import('./ir/types').ProjectIR} roundtrip 
 * @param {string[]} differences 
 * @returns {number} Similarity percentage (0-100)
 */
function compareIR(original, roundtrip, differences) {
  let matches = 0;
  let total = 0;
  
  // Compare metadata
  total++;
  if (original.metadata.name === roundtrip.metadata.name) {
    matches++;
  } else {
    differences.push(`Name mismatch: "${original.metadata.name}" vs "${roundtrip.metadata.name}"`);
  }
  
  // Compare features count
  total++;
  if (original.features.length === roundtrip.features.length) {
    matches++;
  } else {
    differences.push(`Feature count mismatch: ${original.features.length} vs ${roundtrip.features.length}`);
  }
  
  // Compare each feature
  for (let i = 0; i < Math.min(original.features.length, roundtrip.features.length); i++) {
    const origFeature = original.features[i];
    const rtFeature = roundtrip.features[i];
    
    // Compare feature name
    total++;
    if (origFeature.name === rtFeature.name) {
      matches++;
    } else {
      differences.push(`Feature ${i} name mismatch: "${origFeature.name}" vs "${rtFeature.name}"`);
    }
    
    // Compare requirements count
    total++;
    const origReqs = origFeature.specification?.requirements?.length || 0;
    const rtReqs = rtFeature.specification?.requirements?.length || 0;
    if (origReqs === rtReqs) {
      matches++;
    } else {
      differences.push(`Feature ${i} requirements count mismatch: ${origReqs} vs ${rtReqs}`);
    }
    
    // Compare tasks count
    total++;
    const origTasks = origFeature.tasks?.length || 0;
    const rtTasks = rtFeature.tasks?.length || 0;
    if (origTasks === rtTasks) {
      matches++;
    } else {
      differences.push(`Feature ${i} tasks count mismatch: ${origTasks} vs ${rtTasks}`);
    }
  }
  
  // Compare constitution articles
  total++;
  const origArticles = original.constitution?.articles?.length || 0;
  const rtArticles = roundtrip.constitution?.articles?.length || 0;
  if (origArticles === rtArticles) {
    matches++;
  } else {
    differences.push(`Constitution articles count mismatch: ${origArticles} vs ${rtArticles}`);
  }
  
  return Math.round((matches / total) * 100);
}

module.exports = {
  convertFromSpeckit,
  convertToSpeckit,
  convertFromOpenAPI,
  validateFormat,
  testRoundtrip,
  parseMusubiProject,
  parseSpeckitProject,
  parseOpenAPISpec,
  writeMusubiProject,
  writeSpeckitProject,
  ir: irTypes,
};

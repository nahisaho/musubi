/**
 * MUSUBI Parser
 * 
 * Parses MUSUBI project structure into Intermediate Representation (IR)
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { createEmptyProjectIR, createEmptyFeatureIR, createRequirementFromEARS } = require('../ir/types');

/**
 * Parse a MUSUBI project into IR
 * @param {string} projectPath - Path to MUSUBI project root
 * @returns {Promise<import('../ir/types').ProjectIR>} Project IR
 */
async function parseMusubiProject(projectPath) {
  const ir = createEmptyProjectIR();
  
  // Parse project metadata
  ir.metadata = await parseProjectMetadata(projectPath);
  
  // Parse constitution
  ir.constitution = await parseConstitution(projectPath);
  
  // Parse features
  ir.features = await parseFeatures(projectPath);
  
  // Parse templates
  ir.templates = await parseTemplates(projectPath);
  
  // Parse memories
  ir.memories = await parseMemories(projectPath);
  
  return ir;
}

/**
 * Parse project metadata from project.yml
 * @param {string} projectPath 
 * @returns {Promise<import('../ir/types').ProjectMetadata>}
 */
async function parseProjectMetadata(projectPath) {
  const projectYmlPath = path.join(projectPath, 'steering', 'project.yml');
  const productMdPath = path.join(projectPath, 'steering', 'product.md');
  
  const metadata = {
    name: '',
    version: '1.0.0',
    sourceFormat: 'musubi',
    sourceVersion: '2.2.0',
    convertedAt: new Date(),
    preservedFields: {},
  };
  
  // Try to load project.yml
  if (await fs.pathExists(projectYmlPath)) {
    try {
      const content = await fs.readFile(projectYmlPath, 'utf-8');
      const projectYml = yaml.load(content);
      
      metadata.name = projectYml.project?.name || '';
      metadata.version = projectYml.project?.version || '1.0.0';
      metadata.preservedFields.projectYml = projectYml;
    } catch (error) {
      console.warn(`Warning: Failed to parse project.yml: ${error.message}`);
    }
  }
  
  // Try to extract name from product.md if not found
  if (!metadata.name && await fs.pathExists(productMdPath)) {
    try {
      const content = await fs.readFile(productMdPath, 'utf-8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        metadata.name = titleMatch[1].trim();
      }
    } catch (error) {
      console.warn(`Warning: Failed to parse product.md: ${error.message}`);
    }
  }
  
  return metadata;
}

/**
 * Parse constitution from steering/rules/constitution.md
 * @param {string} projectPath 
 * @returns {Promise<import('../ir/types').ConstitutionIR>}
 */
async function parseConstitution(projectPath) {
  const constitutionPath = path.join(projectPath, 'steering', 'rules', 'constitution.md');
  
  const constitution = {
    articles: [],
    corePrinciples: [],
    governance: {
      version: '1.0',
      rules: [],
    },
  };
  
  if (!await fs.pathExists(constitutionPath)) {
    return constitution;
  }
  
  try {
    const content = await fs.readFile(constitutionPath, 'utf-8');
    constitution.rawContent = content;
    
    // Parse articles
    const articleRegex = /##\s+Article\s+(\d+)[:\s]+(.+?)(?=\n##|\n$|$)/gs;
    let match;
    
    while ((match = articleRegex.exec(content)) !== null) {
      const articleNumber = parseInt(match[1], 10);
      const articleContent = match[2].trim();
      
      // Extract article name from first line
      const lines = articleContent.split('\n');
      const name = lines[0].trim();
      
      // Extract description (everything after name until rules)
      let description = '';
      let rulesStart = -1;
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].match(/^[-*]\s+/)) {
          rulesStart = i;
          break;
        }
        description += lines[i] + '\n';
      }
      
      // Extract rules (bullet points)
      const rules = [];
      if (rulesStart !== -1) {
        for (let i = rulesStart; i < lines.length; i++) {
          const ruleMatch = lines[i].match(/^[-*]\s+(.+)/);
          if (ruleMatch) {
            rules.push(ruleMatch[1].trim());
          }
        }
      }
      
      constitution.articles.push({
        number: articleNumber,
        name,
        description: description.trim(),
        rules,
      });
    }
    
    // Parse governance section if present
    const governanceMatch = content.match(/##\s+Governance\s*\n([\s\S]+?)(?=\n##|$)/);
    if (governanceMatch) {
      const governanceContent = governanceMatch[1];
      const versionMatch = governanceContent.match(/version[:\s]+(\d+\.\d+)/i);
      if (versionMatch) {
        constitution.governance.version = versionMatch[1];
      }
      
      // Extract governance rules
      const ruleLines = governanceContent.match(/^[-*]\s+(.+)/gm);
      if (ruleLines) {
        constitution.governance.rules = ruleLines.map(l => l.replace(/^[-*]\s+/, ''));
      }
    }
  } catch (error) {
    console.warn(`Warning: Failed to parse constitution: ${error.message}`);
  }
  
  return constitution;
}

/**
 * Parse features from storage/specs/
 * @param {string} projectPath 
 * @returns {Promise<import('../ir/types').FeatureIR[]>}
 */
async function parseFeatures(projectPath) {
  const specsPath = path.join(projectPath, 'storage', 'specs');
  const features = [];
  
  if (!await fs.pathExists(specsPath)) {
    return features;
  }
  
  try {
    const entries = await fs.readdir(specsPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const featurePath = path.join(specsPath, entry.name);
        const feature = await parseFeature(featurePath, entry.name);
        if (feature) {
          features.push(feature);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Failed to parse features: ${error.message}`);
  }
  
  return features;
}

/**
 * Parse a single feature
 * @param {string} featurePath 
 * @param {string} featureId 
 * @returns {Promise<import('../ir/types').FeatureIR|null>}
 */
async function parseFeature(featurePath, featureId) {
  const feature = createEmptyFeatureIR(featureId, featureId);
  
  // Parse spec.md
  const specPath = path.join(featurePath, 'spec.md');
  if (await fs.pathExists(specPath)) {
    feature.specification = await parseSpecification(specPath);
  }
  
  // Parse plan.md
  const planPath = path.join(featurePath, 'plan.md');
  if (await fs.pathExists(planPath)) {
    feature.plan = await parsePlan(planPath);
  }
  
  // Parse tasks.md
  const tasksPath = path.join(featurePath, 'tasks.md');
  if (await fs.pathExists(tasksPath)) {
    feature.tasks = await parseTasks(tasksPath);
  }
  
  // Parse research.md
  const researchPath = path.join(featurePath, 'research.md');
  if (await fs.pathExists(researchPath)) {
    feature.research = await parseResearch(researchPath);
  }
  
  // Parse data-model.md
  const dataModelPath = path.join(featurePath, 'data-model.md');
  if (await fs.pathExists(dataModelPath)) {
    feature.dataModel = await parseDataModel(dataModelPath);
  }
  
  // Parse contracts directory
  const contractsPath = path.join(featurePath, 'contracts');
  if (await fs.pathExists(contractsPath)) {
    feature.contracts = await parseContracts(contractsPath);
  }
  
  return feature;
}

/**
 * Parse specification file
 * @param {string} specPath 
 * @returns {Promise<import('../ir/types').SpecificationIR>}
 */
async function parseSpecification(specPath) {
  const content = await fs.readFile(specPath, 'utf-8');
  
  const specification = {
    title: '',
    description: '',
    userScenarios: [],
    requirements: [],
    successCriteria: [],
    rawContent: content,
  };
  
  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    specification.title = titleMatch[1].trim();
  }
  
  // Extract description (content before first ## heading)
  const descMatch = content.match(/^#\s+.+\n([\s\S]+?)(?=\n##|$)/);
  if (descMatch) {
    specification.description = descMatch[1].trim();
  }
  
  // Parse EARS requirements
  const requirementsSection = content.match(/##\s+Requirements?\s*\n([\s\S]+?)(?=\n##[^#]|$)/i);
  if (requirementsSection) {
    const reqContent = requirementsSection[1];
    
    // Match requirement patterns like REQ-001, REQ-P0-001, etc.
    // Use greedy match until next ### or ## (non-###) heading
    const reqRegex = /###?\s+(REQ[-\w]+)[:\s]+([^#]+?)(?=\n###?\s+REQ|\n##[^#]|$)/gs;
    let match;
    
    while ((match = reqRegex.exec(reqContent)) !== null) {
      const reqId = match[1];
      const reqBody = match[2].trim();
      
      // Extract EARS statement
      const earsMatch = reqBody.match(/((?:WHEN|WHILE|WHERE|IF)[\s\S]+?SHALL[\s\S]+?\.)/i);
      if (earsMatch) {
        specification.requirements.push(createRequirementFromEARS(reqId, earsMatch[1]));
      } else {
        // Simple requirement without EARS pattern
        specification.requirements.push({
          id: reqId,
          title: '',
          pattern: 'ubiquitous',
          priority: extractPriority(reqId),
          action: reqBody,
          statement: reqBody,
          acceptanceCriteria: [],
        });
      }
    }
  }
  
  // Parse success criteria
  const successSection = content.match(/##\s+Success\s+Criteria\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (successSection) {
    const criteriaContent = successSection[1];
    const criteria = criteriaContent.match(/^[-*]\s+(.+)/gm);
    if (criteria) {
      specification.successCriteria = criteria.map(c => c.replace(/^[-*]\s+/, ''));
    }
  }
  
  return specification;
}

/**
 * Extract priority from requirement ID
 * @param {string} reqId 
 * @returns {import('../ir/types').Priority}
 */
function extractPriority(reqId) {
  const match = reqId.match(/P(\d)/);
  if (match) {
    return `P${match[1]}`;
  }
  return 'P1'; // Default
}

/**
 * Parse plan file
 * @param {string} planPath 
 * @returns {Promise<import('../ir/types').PlanIR>}
 */
async function parsePlan(planPath) {
  const content = await fs.readFile(planPath, 'utf-8');
  
  const plan = {
    summary: '',
    technicalContext: {
      language: '',
      version: '',
      framework: '',
      dependencies: [],
      testing: '',
      targetPlatform: '',
    },
    constitutionCheck: [],
    projectStructure: {
      type: 'single',
      directories: [],
    },
    phases: [],
    rawContent: content,
  };
  
  // Extract summary from first paragraph
  const summaryMatch = content.match(/^#\s+.+\n([\s\S]+?)(?=\n##|$)/);
  if (summaryMatch) {
    plan.summary = summaryMatch[1].trim();
  }
  
  // Parse technical context
  const techSection = content.match(/##\s+Technical\s+Context\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (techSection) {
    const techContent = techSection[1];
    
    // Extract key-value pairs
    const langMatch = techContent.match(/language[:\s]+(.+)/i);
    if (langMatch) plan.technicalContext.language = langMatch[1].trim();
    
    const versionMatch = techContent.match(/version[:\s]+(.+)/i);
    if (versionMatch) plan.technicalContext.version = versionMatch[1].trim();
    
    const frameworkMatch = techContent.match(/framework[:\s]+(.+)/i);
    if (frameworkMatch) plan.technicalContext.framework = frameworkMatch[1].trim();
    
    const testingMatch = techContent.match(/testing[:\s]+(.+)/i);
    if (testingMatch) plan.technicalContext.testing = testingMatch[1].trim();
    
    const platformMatch = techContent.match(/platform[:\s]+(.+)/i);
    if (platformMatch) plan.technicalContext.targetPlatform = platformMatch[1].trim();
  }
  
  // Parse phases
  const phasesSection = content.match(/##\s+Phases?\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (phasesSection) {
    const phasesContent = phasesSection[1];
    const phaseRegex = /###\s+Phase\s+(\d+)[:\s]+(.+?)(?=\n###|\n##|$)/gs;
    let match;
    
    while ((match = phaseRegex.exec(phasesContent)) !== null) {
      const phaseNumber = parseInt(match[1], 10);
      const phaseContent = match[2].trim();
      const lines = phaseContent.split('\n');
      
      plan.phases.push({
        number: phaseNumber,
        name: lines[0].trim(),
        purpose: '',
        outputs: [],
        tasks: [],
      });
    }
  }
  
  return plan;
}

/**
 * Parse tasks file
 * @param {string} tasksPath 
 * @returns {Promise<import('../ir/types').TaskIR[]>}
 */
async function parseTasks(tasksPath) {
  const content = await fs.readFile(tasksPath, 'utf-8');
  const tasks = [];
  
  // Match task lines like: - [ ] T001: Description
  const taskRegex = /^[-*]\s+\[([xX ])\]\s+(T\d+)[:\s]+(.+)$/gm;
  let match;
  
  while ((match = taskRegex.exec(content)) !== null) {
    const completed = match[1].toLowerCase() === 'x';
    const taskId = match[2];
    const description = match[3].trim();
    
    // Extract phase from context
    let phase = 1;
    const phaseMatch = content.slice(0, match.index).match(/##\s+Phase\s+(\d+)/gi);
    if (phaseMatch) {
      const lastPhase = phaseMatch[phaseMatch.length - 1];
      const phaseNum = lastPhase.match(/(\d+)/);
      if (phaseNum) {
        phase = parseInt(phaseNum[1], 10);
      }
    }
    
    // Check for parallel marker [P]
    const parallel = description.includes('[P]');
    
    // Extract file path if present
    const filePathMatch = description.match(/(?:at|in|path:)\s+([^\s]+)/i);
    const filePath = filePathMatch ? filePathMatch[1] : undefined;
    
    // Extract user story reference
    const storyMatch = description.match(/\[US\d+\]/);
    const userStory = storyMatch ? storyMatch[0].replace(/[[\]]/g, '') : undefined;
    
    tasks.push({
      id: taskId,
      description: description.replace(/\[P\]|\[US\d+\]/g, '').trim(),
      phase,
      userStory,
      parallel,
      filePath,
      completed,
    });
  }
  
  return tasks;
}

/**
 * Parse research file
 * @param {string} researchPath 
 * @returns {Promise<import('../ir/types').ResearchIR>}
 */
async function parseResearch(researchPath) {
  const content = await fs.readFile(researchPath, 'utf-8');
  
  const research = {
    decisions: [],
    alternatives: [],
    rawContent: content,
  };
  
  // Parse decisions section
  const decisionsSection = content.match(/##\s+Decisions?\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (decisionsSection) {
    const decisionContent = decisionsSection[1];
    const decisionRegex = /###\s+(.+?)\n([\s\S]+?)(?=\n###|$)/g;
    let match;
    
    while ((match = decisionRegex.exec(decisionContent)) !== null) {
      const topic = match[1].trim();
      const body = match[2].trim();
      
      const decisionMatch = body.match(/decision[:\s]+(.+)/i);
      const rationaleMatch = body.match(/rationale[:\s]+(.+)/i);
      
      research.decisions.push({
        topic,
        decision: decisionMatch ? decisionMatch[1].trim() : body.split('\n')[0],
        rationale: rationaleMatch ? rationaleMatch[1].trim() : '',
      });
    }
  }
  
  // Parse alternatives section
  const alternativesSection = content.match(/##\s+Alternatives?\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (alternativesSection) {
    const altContent = alternativesSection[1];
    const altRegex = /###\s+(.+?)\n([\s\S]+?)(?=\n###|$)/g;
    let match;
    
    while ((match = altRegex.exec(altContent)) !== null) {
      const name = match[1].trim();
      const body = match[2].trim();
      
      // Extract pros and cons
      const prosMatch = body.match(/pros?[:\s]*([\s\S]+?)(?=cons?|rejected|$)/i);
      const consMatch = body.match(/cons?[:\s]*([\s\S]+?)(?=pros?|rejected|$)/i);
      const rejectedMatch = body.match(/rejected[:\s]*(yes|no|true|false)/i);
      const reasonMatch = body.match(/reason[:\s]+(.+)/i);
      
      const pros = prosMatch 
        ? (prosMatch[1].match(/^[-*]\s+(.+)/gm) || []).map(p => p.replace(/^[-*]\s+/, ''))
        : [];
      const cons = consMatch 
        ? (consMatch[1].match(/^[-*]\s+(.+)/gm) || []).map(c => c.replace(/^[-*]\s+/, ''))
        : [];
      
      research.alternatives.push({
        name,
        pros,
        cons,
        rejected: rejectedMatch ? ['yes', 'true'].includes(rejectedMatch[1].toLowerCase()) : false,
        reason: reasonMatch ? reasonMatch[1].trim() : undefined,
      });
    }
  }
  
  return research;
}

/**
 * Parse data model file
 * @param {string} dataModelPath 
 * @returns {Promise<import('../ir/types').DataModelIR>}
 */
async function parseDataModel(dataModelPath) {
  const content = await fs.readFile(dataModelPath, 'utf-8');
  
  const dataModel = {
    entities: [],
    relationships: [],
    rawContent: content,
  };
  
  // Parse entities (look for ### Entity: Name or ### Name patterns)
  const entityRegex = /###\s+(?:Entity:?\s+)?(\w+)\s*\n([\s\S]+?)(?=\n###|$)/gi;
  let match;
  
  while ((match = entityRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2].trim();
    
    // Extract fields from table or list
    const fields = [];
    const fieldRegex = /[-*]\s+(\w+):\s+(.+)/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.push({
        name: fieldMatch[1],
        type: fieldMatch[2].trim(),
        required: false,
        unique: false,
      });
    }
    
    dataModel.entities.push({
      name,
      description: '',
      fields,
    });
  }
  
  // Parse relationships
  const relationshipSection = content.match(/##\s+Relationships?\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (relationshipSection) {
    const relContent = relationshipSection[1];
    const relRegex = /(\w+)\s*(?:→|->|has many|has one|belongs to)\s*(\w+)/gi;
    let relMatch;
    
    while ((relMatch = relRegex.exec(relContent)) !== null) {
      dataModel.relationships.push({
        from: relMatch[1],
        to: relMatch[2],
        type: relContent.toLowerCase().includes('many') ? 'one-to-many' : 'one-to-one',
      });
    }
  }
  
  return dataModel;
}

/**
 * Parse contracts directory
 * @param {string} contractsPath 
 * @returns {Promise<import('../ir/types').ContractIR[]>}
 */
async function parseContracts(contractsPath) {
  const contracts = [];
  
  try {
    const entries = await fs.readdir(contractsPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const contractFile = path.join(contractsPath, entry.name);
        const content = await fs.readFile(contractFile, 'utf-8');
        
        // Determine contract type
        let type = 'other';
        if (content.includes('REST') || content.includes('GET') || content.includes('POST')) {
          type = 'rest';
        } else if (content.includes('GraphQL') || content.includes('query') || content.includes('mutation')) {
          type = 'graphql';
        } else if (content.includes('gRPC')) {
          type = 'grpc';
        } else if (content.includes('WebSocket')) {
          type = 'websocket';
        }
        
        contracts.push({
          type,
          name: entry.name.replace('.md', ''),
          definition: {},
          rawContent: content,
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Failed to parse contracts: ${error.message}`);
  }
  
  return contracts;
}

/**
 * Parse templates from steering/templates/
 * @param {string} projectPath 
 * @returns {Promise<import('../ir/types').TemplateIR[]>}
 */
async function parseTemplates(projectPath) {
  const templatesPath = path.join(projectPath, 'steering', 'templates');
  const templates = [];
  
  if (!await fs.pathExists(templatesPath)) {
    return templates;
  }
  
  try {
    const entries = await fs.readdir(templatesPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const templateFile = path.join(templatesPath, entry.name);
        const content = await fs.readFile(templateFile, 'utf-8');
        
        // Determine template type
        let type = 'other';
        if (entry.name.includes('spec')) {
          type = 'spec';
        } else if (entry.name.includes('plan')) {
          type = 'plan';
        } else if (entry.name.includes('task')) {
          type = 'tasks';
        }
        
        templates.push({
          name: entry.name.replace('.md', ''),
          type,
          content,
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Failed to parse templates: ${error.message}`);
  }
  
  return templates;
}

/**
 * Parse memories from steering/memories/
 * @param {string} projectPath 
 * @returns {Promise<import('../ir/types').MemoryIR[]>}
 */
async function parseMemories(projectPath) {
  const memoriesPath = path.join(projectPath, 'steering', 'memories');
  const memories = [];
  
  if (!await fs.pathExists(memoriesPath)) {
    return memories;
  }
  
  try {
    const entries = await fs.readdir(memoriesPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const memoryFile = path.join(memoriesPath, entry.name);
        const content = await fs.readFile(memoryFile, 'utf-8');
        
        // Determine memory type
        let type = 'context';
        if (entry.name.includes('decision')) {
          type = 'decision';
        } else if (entry.name.includes('learning')) {
          type = 'learning';
        }
        
        memories.push({
          category: type,
          entries: [{ content, source: entry.name }],
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Failed to parse memories: ${error.message}`);
  }
  
  return memories;
}

module.exports = {
  parseMusubiProject,
  parseProjectMetadata,
  parseConstitution,
  parseFeatures,
  parseFeature,
  parseSpecification,
  parsePlan,
  parseTasks,
  parseResearch,
  parseDataModel,
  parseContracts,
  parseTemplates,
  parseMemories,
};

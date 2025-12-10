/**
 * Spec Kit Parser
 * 
 * Parses Spec Kit project structure into Intermediate Representation (IR)
 * 
 * Spec Kit structure:
 * .specify/
 * ├── memory/
 * │   └── constitution.md
 * ├── specs/
 * │   └── ###-feature/
 * │       ├── spec.md
 * │       ├── plan.md
 * │       ├── tasks.md
 * │       ├── research.md
 * │       ├── data-model.md
 * │       ├── contracts/
 * │       └── quickstart.md
 * └── templates/
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const { 
  createEmptyProjectIR, 
  createEmptyFeatureIR,
  userScenarioToRequirement 
} = require('../ir/types');

/**
 * Parse a Spec Kit project into IR
 * @param {string} projectPath - Path to project root (containing .specify/)
 * @returns {Promise<import('../ir/types').ProjectIR>} Project IR
 */
async function parseSpeckitProject(projectPath) {
  const specifyPath = path.join(projectPath, '.specify');
  
  if (!await fs.pathExists(specifyPath)) {
    throw new Error(`Not a Spec Kit project: .specify directory not found at ${projectPath}`);
  }
  
  const ir = createEmptyProjectIR();
  ir.metadata.sourceFormat = 'speckit';
  
  // Parse project name from directory
  ir.metadata.name = path.basename(projectPath);
  
  // Parse constitution
  ir.constitution = await parseConstitution(specifyPath);
  
  // Parse features
  ir.features = await parseFeatures(specifyPath);
  
  // Parse templates
  ir.templates = await parseTemplates(specifyPath);
  
  return ir;
}

/**
 * Parse constitution from .specify/memory/constitution.md
 * @param {string} specifyPath 
 * @returns {Promise<import('../ir/types').ConstitutionIR>}
 */
async function parseConstitution(specifyPath) {
  const constitutionPath = path.join(specifyPath, 'memory', 'constitution.md');
  
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
    
    // Parse Core Principles section (Spec Kit format)
    const principlesSection = content.match(/##\s+Core\s+Principles?\s*\n([\s\S]+?)(?=\n##|$)/i);
    if (principlesSection) {
      const principlesContent = principlesSection[1];
      const principleRegex = /###\s+(.+?)\n([\s\S]+?)(?=\n###|$)/g;
      let match;
      
      while ((match = principleRegex.exec(principlesContent)) !== null) {
        const name = match[1].trim();
        const description = match[2].trim();
        
        constitution.corePrinciples.push({
          name,
          description,
          mappedToArticle: mapPrincipleToArticle(name, description),
        });
      }
    }
    
    // Parse simple bullet list principles
    if (constitution.corePrinciples.length === 0) {
      const bulletPrinciples = content.match(/^[-*]\s+\*\*(.+?)\*\*[:\s]+(.+)$/gm);
      if (bulletPrinciples) {
        for (const line of bulletPrinciples) {
          const match = line.match(/[-*]\s+\*\*(.+?)\*\*[:\s]+(.+)/);
          if (match) {
            constitution.corePrinciples.push({
              name: match[1].trim(),
              description: match[2].trim(),
              mappedToArticle: mapPrincipleToArticle(match[1], match[2]),
            });
          }
        }
      }
    }
    
    // Parse Governance section
    const governanceSection = content.match(/##\s+Governance\s*\n([\s\S]+?)(?=\n##|$)/i);
    if (governanceSection) {
      const govContent = governanceSection[1];
      
      const versionMatch = govContent.match(/version[:\s]+(\d+\.\d+)/i);
      if (versionMatch) {
        constitution.governance.version = versionMatch[1];
      }
      
      const ruleLines = govContent.match(/^[-*]\s+(.+)/gm);
      if (ruleLines) {
        constitution.governance.rules = ruleLines.map(l => l.replace(/^[-*]\s+/, ''));
      }
    }
    
    // Convert principles to articles
    constitution.articles = mapPrinciplesToArticles(constitution.corePrinciples);
    
  } catch (error) {
    console.warn(`Warning: Failed to parse constitution: ${error.message}`);
  }
  
  return constitution;
}

/**
 * MUSUBI 9 Articles mapping keywords
 */
const MUSUBI_ARTICLES = [
  { number: 1, name: 'Specification Primacy', keywords: ['spec', 'requirement', 'documentation', 'define', 'specify'] },
  { number: 2, name: 'Test-First Development', keywords: ['test', 'quality', 'validation', 'verify', 'tdd'] },
  { number: 3, name: 'Architectural Compliance', keywords: ['architecture', 'structure', 'design', 'pattern', 'component'] },
  { number: 4, name: 'Traceability Requirements', keywords: ['trace', 'track', 'link', 'reference', 'map'] },
  { number: 5, name: 'Change Control Protocol', keywords: ['change', 'version', 'control', 'update', 'modify'] },
  { number: 6, name: 'Separation of Concerns', keywords: ['separation', 'modular', 'concern', 'decouple', 'isolate'] },
  { number: 7, name: 'Documentation Standards', keywords: ['document', 'standard', 'format', 'readme', 'comment'] },
  { number: 8, name: 'Continuous Validation', keywords: ['continuous', 'validate', 'check', 'ci', 'automate'] },
  { number: 9, name: 'Graceful Degradation', keywords: ['graceful', 'fallback', 'degrade', 'error', 'recover'] }
];

/**
 * Map a principle name/description to a MUSUBI article number
 * @param {string} name 
 * @param {string} description 
 * @returns {number|undefined}
 */
function mapPrincipleToArticle(name, description) {
  const combined = `${name} ${description}`.toLowerCase();
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const article of MUSUBI_ARTICLES) {
    let score = 0;
    for (const keyword of article.keywords) {
      if (combined.includes(keyword)) {
        score++;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = article.number;
    }
  }
  
  return bestScore > 0 ? bestMatch : undefined;
}

/**
 * Map principles to MUSUBI articles
 * @param {import('../ir/types').PrincipleIR[]} principles 
 * @returns {import('../ir/types').ArticleIR[]}
 */
function mapPrinciplesToArticles(principles) {
  const articles = [];
  const usedArticles = new Set();
  
  // First pass: map principles to articles
  for (const principle of principles) {
    if (principle.mappedToArticle && !usedArticles.has(principle.mappedToArticle)) {
      const article = MUSUBI_ARTICLES.find(a => a.number === principle.mappedToArticle);
      if (article) {
        articles.push({
          number: article.number,
          name: article.name,
          description: principle.description,
          rules: extractRulesFromDescription(principle.description),
          mappedFrom: principle.name,
        });
        usedArticles.add(article.number);
      }
    }
  }
  
  // Fill missing articles with defaults
  for (const article of MUSUBI_ARTICLES) {
    if (!usedArticles.has(article.number)) {
      articles.push({
        number: article.number,
        name: article.name,
        description: getDefaultDescription(article.number),
        rules: getDefaultRules(article.number),
      });
    }
  }
  
  return articles.sort((a, b) => a.number - b.number);
}

/**
 * Extract rules from description
 * @param {string} description 
 * @returns {string[]}
 */
function extractRulesFromDescription(description) {
  const rules = [];
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  for (const sentence of sentences) {
    if (sentence.includes('must') || sentence.includes('shall') || sentence.includes('should')) {
      rules.push(sentence.trim());
    }
  }
  
  return rules.length > 0 ? rules : [description];
}

/**
 * Get default description for article
 * @param {number} articleNumber 
 * @returns {string}
 */
function getDefaultDescription(articleNumber) {
  const defaults = {
    1: 'Specifications define the system. Implementation follows specification.',
    2: 'Tests are written before implementation to ensure correctness.',
    3: 'Architecture patterns are followed consistently throughout the codebase.',
    4: 'All artifacts maintain bidirectional traceability.',
    5: 'Changes are controlled through formal change management processes.',
    6: 'Components are separated by responsibility and concern.',
    7: 'Documentation follows consistent standards and is kept current.',
    8: 'Validation is automated and runs continuously.',
    9: 'Systems degrade gracefully and recover from failures.',
  };
  return defaults[articleNumber] || '';
}

/**
 * Get default rules for article
 * @param {number} articleNumber 
 * @returns {string[]}
 */
function getDefaultRules(articleNumber) {
  const defaults = {
    1: ['All features must be specified before implementation', 'Specifications are the single source of truth'],
    2: ['Tests must be written before production code', 'All code must have corresponding tests'],
    3: ['Follow established architectural patterns', 'Document architectural decisions'],
    4: ['Requirements trace to tests', 'Tests trace to implementation'],
    5: ['Changes require impact analysis', 'Changes are versioned and documented'],
    6: ['Single responsibility principle', 'Minimize coupling between components'],
    7: ['Document all public APIs', 'Keep documentation synchronized with code'],
    8: ['Run validation on every commit', 'Automated checks gate releases'],
    9: ['Handle all error conditions', 'Provide meaningful error messages'],
  };
  return defaults[articleNumber] || [];
}

/**
 * Parse features from .specify/specs/
 * @param {string} specifyPath 
 * @returns {Promise<import('../ir/types').FeatureIR[]>}
 */
async function parseFeatures(specifyPath) {
  const specsPath = path.join(specifyPath, 'specs');
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
  const feature = createEmptyFeatureIR(featureId, extractFeatureName(featureId));
  
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
  
  // Parse quickstart.md
  const quickstartPath = path.join(featurePath, 'quickstart.md');
  if (await fs.pathExists(quickstartPath)) {
    feature.quickstart = await parseQuickstart(quickstartPath);
  }
  
  return feature;
}

/**
 * Extract feature name from ID (e.g., "001-photo-albums" -> "Photo Albums")
 * @param {string} featureId 
 * @returns {string}
 */
function extractFeatureName(featureId) {
  // Remove leading numbers and dashes
  const name = featureId.replace(/^\d+-/, '');
  // Convert kebab-case to Title Case
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parse specification file (Spec Kit format with User Scenarios)
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
  
  // Parse User Scenarios (Spec Kit format)
  const scenariosSection = content.match(/##\s+User\s+Scenarios?\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (scenariosSection) {
    specification.userScenarios = parseUserScenarios(scenariosSection[1]);
    
    // Convert user scenarios to EARS requirements
    let reqIndex = 1;
    for (const scenario of specification.userScenarios) {
      const reqId = `REQ-${String(reqIndex++).padStart(3, '0')}`;
      specification.requirements.push(userScenarioToRequirement(scenario, reqId));
    }
  }
  
  // Parse Requirements section if present (direct requirements)
  const requirementsSection = content.match(/##\s+Requirements?\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (requirementsSection && !scenariosSection) {
    // Parse requirements directly
    const reqContent = requirementsSection[1];
    const reqLines = reqContent.match(/^[-*]\s+(.+)$/gm);
    
    if (reqLines) {
      let reqIndex = specification.requirements.length + 1;
      for (const line of reqLines) {
        const reqText = line.replace(/^[-*]\s+/, '');
        specification.requirements.push({
          id: `REQ-${String(reqIndex++).padStart(3, '0')}`,
          title: '',
          pattern: 'ubiquitous',
          priority: 'P1',
          action: reqText,
          statement: `The system SHALL ${reqText}.`,
          acceptanceCriteria: [],
        });
      }
    }
  }
  
  // Parse Success Criteria
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
 * Parse user scenarios from content
 * @param {string} content 
 * @returns {import('../ir/types').UserScenarioIR[]}
 */
function parseUserScenarios(content) {
  const scenarios = [];
  
  // Match user story format: "As a [actor], I want to [action] so that [benefit]"
  const storyRegex = /###\s+(.+?)\n([\s\S]+?)(?=\n###|$)/g;
  let match;
  let storyIndex = 1;
  
  while ((match = storyRegex.exec(content)) !== null) {
    const title = match[1].trim();
    const body = match[2].trim();
    
    // Parse "As a X, I want Y so that Z" pattern
    const asMatch = body.match(/As\s+(?:a|an)\s+(.+?),\s+I\s+want\s+(?:to\s+)?(.+?)\s+so\s+that\s+(.+?)(?:\.|$)/i);
    
    if (asMatch) {
      const scenario = {
        id: `US${storyIndex++}`,
        title,
        actor: asMatch[1].trim(),
        action: asMatch[2].trim(),
        benefit: asMatch[3].trim(),
        priority: extractPriorityFromContent(body),
        acceptanceCriteria: parseAcceptanceCriteria(body),
      };
      scenarios.push(scenario);
    } else {
      // Fallback: treat whole body as a scenario
      scenarios.push({
        id: `US${storyIndex++}`,
        title,
        actor: 'user',
        action: body.split('\n')[0],
        benefit: 'accomplish their goal',
        priority: 'P1',
        acceptanceCriteria: parseAcceptanceCriteria(body),
      });
    }
  }
  
  // Also check for simple bullet list format
  if (scenarios.length === 0) {
    const bulletStories = content.match(/^[-*]\s+As\s+(?:a|an)\s+.+$/gm);
    if (bulletStories) {
      for (const line of bulletStories) {
        const asMatch = line.match(/As\s+(?:a|an)\s+(.+?),\s+I\s+want\s+(?:to\s+)?(.+?)\s+so\s+that\s+(.+?)(?:\.|$)/i);
        if (asMatch) {
          scenarios.push({
            id: `US${storyIndex++}`,
            title: `User Story ${storyIndex}`,
            actor: asMatch[1].trim(),
            action: asMatch[2].trim(),
            benefit: asMatch[3].trim(),
            priority: 'P1',
            acceptanceCriteria: [],
          });
        }
      }
    }
  }
  
  return scenarios;
}

/**
 * Parse acceptance criteria from content
 * @param {string} content 
 * @returns {import('../ir/types').AcceptanceCriterionIR[]}
 */
function parseAcceptanceCriteria(content) {
  const criteria = [];
  
  // Look for Acceptance Criteria section
  const acSection = content.match(/(?:Acceptance\s+Criteria|AC)[:\s]*([\s\S]+?)(?=\n\n|$)/i);
  if (acSection) {
    const acContent = acSection[1];
    const acLines = acContent.match(/^[-*]\s+(.+)$/gm);
    
    if (acLines) {
      let acIndex = 1;
      for (const line of acLines) {
        criteria.push({
          id: `AC${acIndex++}`,
          description: line.replace(/^[-*]\s+/, '').trim(),
          testable: true,
        });
      }
    }
  }
  
  return criteria;
}

/**
 * Extract priority from content
 * @param {string} content 
 * @returns {import('../ir/types').Priority}
 */
function extractPriorityFromContent(content) {
  const priorityMatch = content.match(/priority[:\s]*(P\d)/i);
  if (priorityMatch) {
    return priorityMatch[1];
  }
  
  if (content.toLowerCase().includes('critical') || content.toLowerCase().includes('must have')) {
    return 'P0';
  }
  if (content.toLowerCase().includes('high')) {
    return 'P1';
  }
  if (content.toLowerCase().includes('medium')) {
    return 'P2';
  }
  if (content.toLowerCase().includes('low') || content.toLowerCase().includes('nice to have')) {
    return 'P3';
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
  
  // Extract summary
  const summaryMatch = content.match(/^#\s+.+\n([\s\S]+?)(?=\n##|$)/);
  if (summaryMatch) {
    plan.summary = summaryMatch[1].trim();
  }
  
  // Parse Technical Context
  const techSection = content.match(/##\s+Technical\s+(?:Context|Stack)\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (techSection) {
    const techContent = techSection[1];
    
    const langMatch = techContent.match(/(?:language|lang)[:\s]+(.+)/i);
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
  
  // Parse Phases
  const phasesSection = content.match(/##\s+(?:Implementation\s+)?Phases?\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (phasesSection) {
    const phasesContent = phasesSection[1];
    const phaseRegex = /###\s+Phase\s+(\d+)[:\s]*(.+?)(?=\n###|\n##|$)/gs;
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
 * Parse tasks file (Spec Kit format)
 * @param {string} tasksPath 
 * @returns {Promise<import('../ir/types').TaskIR[]>}
 */
async function parseTasks(tasksPath) {
  const content = await fs.readFile(tasksPath, 'utf-8');
  const tasks = [];
  
  // Spec Kit task format: - [ ] T001 [P] [US1] Description at path/
  const taskRegex = /^[-*]\s+\[([xX ])\]\s+(T\d+)\s*(\[P\])?\s*(\[US\d+\])?\s*(.+)$/gm;
  let match;
  let currentPhase = 1;
  
  // Track current phase from headings
  const _lines = content.split('\n');
  let _lineIndex = 0;
  
  while ((match = taskRegex.exec(content)) !== null) {
    // Find current phase by looking at preceding headings
    const textBefore = content.slice(0, match.index);
    const phaseMatch = textBefore.match(/##\s+Phase\s+(\d+)/gi);
    if (phaseMatch) {
      const lastPhase = phaseMatch[phaseMatch.length - 1];
      const phaseNum = lastPhase.match(/(\d+)/);
      if (phaseNum) {
        currentPhase = parseInt(phaseNum[1], 10);
      }
    }
    
    const completed = match[1].toLowerCase() === 'x';
    const taskId = match[2];
    const isParallel = !!match[3];
    const userStory = match[4] ? match[4].replace(/[[\]]/g, '') : undefined;
    const description = match[5].trim();
    
    // Extract file path if present
    const filePathMatch = description.match(/(?:at|in)\s+([^\s]+\/?)$/i);
    const filePath = filePathMatch ? filePathMatch[1] : undefined;
    const cleanDescription = filePathMatch 
      ? description.replace(filePathMatch[0], '').trim() 
      : description;
    
    tasks.push({
      id: taskId,
      description: cleanDescription,
      phase: currentPhase,
      userStory,
      parallel: isParallel,
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
  
  // Parse Decisions section
  const decisionsSection = content.match(/##\s+Decisions?\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (decisionsSection) {
    const decisionContent = decisionsSection[1];
    const decisionRegex = /###\s+(.+?)\n([\s\S]+?)(?=\n###|$)/g;
    let match;
    
    while ((match = decisionRegex.exec(decisionContent)) !== null) {
      const topic = match[1].trim();
      const body = match[2].trim();
      
      const decisionMatch = body.match(/(?:decision|chose|selected)[:\s]+(.+)/i);
      const rationaleMatch = body.match(/(?:rationale|because|reason)[:\s]+(.+)/i);
      
      research.decisions.push({
        topic,
        decision: decisionMatch ? decisionMatch[1].trim() : body.split('\n')[0],
        rationale: rationaleMatch ? rationaleMatch[1].trim() : '',
      });
    }
  }
  
  // Parse Alternatives section
  const alternativesSection = content.match(/##\s+Alternatives?\s+Considered\s*\n([\s\S]+?)(?=\n##|$)/i);
  if (alternativesSection) {
    const altContent = alternativesSection[1];
    const altRegex = /###\s+(.+?)\n([\s\S]+?)(?=\n###|$)/g;
    let match;
    
    while ((match = altRegex.exec(altContent)) !== null) {
      const name = match[1].trim();
      const body = match[2].trim();
      
      const prosMatch = body.match(/pros?[:\s]*([\s\S]+?)(?=cons?|rejected|$)/i);
      const consMatch = body.match(/cons?[:\s]*([\s\S]+?)(?=pros?|rejected|$)/i);
      const rejectedMatch = body.match(/(?:rejected|status)[:\s]*(yes|no|true|false|rejected)/i);
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
        rejected: rejectedMatch ? ['yes', 'true', 'rejected'].includes(rejectedMatch[1].toLowerCase()) : false,
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
  
  // Parse entities
  const entityRegex = /###\s+(?:Entity:?\s+)?(\w+)\s*\n([\s\S]+?)(?=\n###|$)/gi;
  let match;
  
  while ((match = entityRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2].trim();
    
    const fields = [];
    const fieldRegex = /[-*]\s+(\w+)(?:\s*:\s*|\s+\()(.+?)(?:\)|$)/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2].trim();
      
      fields.push({
        name: fieldName,
        type: fieldType,
        required: body.toLowerCase().includes(`${fieldName}`.toLowerCase() + ' required') 
                  || body.includes(`${fieldName}*`),
        unique: body.toLowerCase().includes(`${fieldName}`.toLowerCase() + ' unique'),
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
    const relRegex = /(\w+)\s*(?:→|->|has many|has one|belongs to|references)\s*(\w+)/gi;
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
      if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.yaml') || entry.name.endsWith('.json'))) {
        const contractFile = path.join(contractsPath, entry.name);
        const content = await fs.readFile(contractFile, 'utf-8');
        
        // Determine contract type
        let type = 'other';
        if (content.includes('openapi') || content.includes('swagger') || entry.name.includes('openapi')) {
          type = 'rest';
        } else if (content.includes('REST') || content.includes('GET') || content.includes('POST')) {
          type = 'rest';
        } else if (content.includes('GraphQL') || content.includes('query') || content.includes('mutation')) {
          type = 'graphql';
        } else if (content.includes('gRPC') || content.includes('protobuf')) {
          type = 'grpc';
        } else if (content.includes('WebSocket') || content.includes('ws://')) {
          type = 'websocket';
        }
        
        contracts.push({
          type,
          name: entry.name.replace(/\.(md|yaml|json)$/, ''),
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
 * Parse quickstart file
 * @param {string} quickstartPath 
 * @returns {Promise<import('../ir/types').QuickstartIR>}
 */
async function parseQuickstart(quickstartPath) {
  const content = await fs.readFile(quickstartPath, 'utf-8');
  
  const quickstart = {
    steps: [],
    rawContent: content,
  };
  
  // Parse numbered steps
  const stepRegex = /^\d+\.\s+(.+)$/gm;
  let match;
  
  while ((match = stepRegex.exec(content)) !== null) {
    quickstart.steps.push({
      step: match[1].trim(),
    });
  }
  
  return quickstart;
}

/**
 * Parse templates from .specify/templates/
 * @param {string} specifyPath 
 * @returns {Promise<import('../ir/types').TemplateIR[]>}
 */
async function parseTemplates(specifyPath) {
  const templatesPath = path.join(specifyPath, 'templates');
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

module.exports = {
  parseSpeckitProject,
  parseConstitution,
  parseFeatures,
  parseFeature,
  parseSpecification,
  parsePlan,
  parseTasks,
  parseResearch,
  parseDataModel,
  parseContracts,
  parseQuickstart,
  parseTemplates,
  parseUserScenarios,
  parseAcceptanceCriteria,
};

/**
 * Complex Workflow Examples
 * Sprint 3.5: Advanced Workflows
 * 
 * Real-world workflow templates demonstrating:
 * - Multi-stage feature development
 * - CI/CD integration
 * - Code review automation
 * - Incident response
 * - Data pipeline orchestration
 */

const { WorkflowDefinition, StepType, RecoveryStrategy } = require('./workflow-executor');

/**
 * Feature Development Workflow
 * 
 * Complete SDD-based feature development from requirements to deployment
 */
const featureDevelopmentWorkflow = new WorkflowDefinition(
  'feature-development',
  'Feature Development Workflow',
  [
    // Stage 1: Requirements
    {
      id: 'gather-requirements',
      type: StepType.SKILL,
      skillId: 'sdd-requirements',
      input: {
        feature: { $var: 'feature_name' },
        description: { $var: 'description' },
        stakeholders: { $var: 'stakeholders', default: [] }
      },
      outputVariable: 'requirements'
    },
    {
      id: 'requirements-checkpoint',
      type: StepType.CHECKPOINT,
      name: 'requirements-complete'
    },
    
    // Stage 2: Design
    {
      id: 'create-design',
      type: StepType.SKILL,
      skillId: 'sdd-design',
      input: {
        feature: { $var: 'feature_name' },
        requirements: { $var: 'requirements' }
      },
      outputVariable: 'design'
    },
    {
      id: 'design-review',
      type: StepType.HUMAN_REVIEW,
      message: 'Review design for ${feature_name}:\n\n${design}',
      options: ['approve', 'request-changes', 'reject']
    },
    {
      id: 'design-checkpoint',
      type: StepType.CHECKPOINT,
      name: 'design-approved'
    },
    
    // Stage 3: Task Breakdown
    {
      id: 'create-tasks',
      type: StepType.SKILL,
      skillId: 'sdd-tasks',
      input: {
        feature: { $var: 'feature_name' },
        design: { $var: 'design' }
      },
      outputVariable: 'tasks'
    },
    
    // Stage 4: Implementation (parallel where possible)
    {
      id: 'implement-tasks',
      type: StepType.LOOP,
      items: { $var: 'tasks' },
      itemVariable: 'current_task',
      indexVariable: 'task_index',
      steps: [
        {
          id: 'implement-task',
          type: StepType.SKILL,
          skillId: 'sdd-implement',
          input: {
            task: { $var: 'current_task' },
            design: { $var: 'design' }
          },
          outputVariable: 'implementation_${task_index}'
        },
        {
          id: 'run-tests',
          type: StepType.TOOL,
          toolName: 'run_tests',
          arguments: {
            files: { $var: 'implementation_${task_index}.testFiles' }
          }
        }
      ]
    },
    
    // Stage 5: Validation
    {
      id: 'validate-implementation',
      type: StepType.SKILL,
      skillId: 'sdd-validate',
      input: {
        feature: { $var: 'feature_name' },
        design: { $var: 'design' }
      },
      outputVariable: 'validation_result',
      onError: {
        strategy: RecoveryStrategy.ROLLBACK,
        rollbackTo: 'design-approved'
      }
    },
    
    // Stage 6: Documentation
    {
      id: 'generate-docs',
      type: StepType.PARALLEL,
      maxConcurrency: 3,
      steps: [
        {
          id: 'api-docs',
          type: StepType.SKILL,
          skillId: 'documentation',
          input: { type: 'api', source: { $var: 'implementation' } }
        },
        {
          id: 'user-docs',
          type: StepType.SKILL,
          skillId: 'documentation',
          input: { type: 'user-guide', feature: { $var: 'feature_name' } }
        },
        {
          id: 'changelog',
          type: StepType.SKILL,
          skillId: 'documentation',
          input: { type: 'changelog', feature: { $var: 'feature_name' } }
        }
      ],
      outputVariable: 'documentation'
    }
  ],
  {
    description: 'Complete feature development workflow following SDD methodology',
    version: '1.0.0',
    inputs: [
      { name: 'feature_name', type: 'string', required: true },
      { name: 'description', type: 'string', required: true },
      { name: 'stakeholders', type: 'array', required: false }
    ],
    outputs: [
      { name: 'requirements', from: 'requirements' },
      { name: 'design', from: 'design' },
      { name: 'tasks', from: 'tasks' },
      { name: 'validation', from: 'validation_result' },
      { name: 'documentation', from: 'documentation' }
    ],
    errorHandling: {
      strategy: RecoveryStrategy.ROLLBACK,
      rollbackTo: 'requirements-complete'
    },
    retryPolicy: {
      maxRetries: 2,
      backoffMs: 5000
    }
  }
);

/**
 * CI/CD Pipeline Workflow
 * 
 * Automated build, test, and deployment pipeline
 */
const cicdPipelineWorkflow = new WorkflowDefinition(
  'cicd-pipeline',
  'CI/CD Pipeline Workflow',
  [
    // Pre-flight checks
    {
      id: 'preflight-checks',
      type: StepType.PARALLEL,
      steps: [
        {
          id: 'lint-check',
          type: StepType.TOOL,
          toolName: 'run_command',
          arguments: { command: 'npm run lint' }
        },
        {
          id: 'type-check',
          type: StepType.TOOL,
          toolName: 'run_command',
          arguments: { command: 'npm run typecheck' }
        },
        {
          id: 'security-scan',
          type: StepType.TOOL,
          toolName: 'run_command',
          arguments: { command: 'npm audit --production' },
          onError: { strategy: RecoveryStrategy.SKIP }
        }
      ]
    },
    
    // Build
    {
      id: 'build',
      type: StepType.TOOL,
      toolName: 'run_command',
      arguments: {
        command: 'npm run build',
        env: {
          NODE_ENV: 'production',
          BUILD_ID: { $var: 'build_id' }
        }
      },
      outputVariable: 'build_result',
      retry: { maxRetries: 2, backoffMs: 10000 }
    },
    {
      id: 'build-checkpoint',
      type: StepType.CHECKPOINT,
      name: 'build-complete'
    },
    
    // Test stages
    {
      id: 'unit-tests',
      type: StepType.TOOL,
      toolName: 'run_tests',
      arguments: {
        type: 'unit',
        coverage: true,
        coverageThreshold: 80
      },
      outputVariable: 'unit_test_result'
    },
    {
      id: 'integration-tests',
      type: StepType.TOOL,
      toolName: 'run_tests',
      arguments: { type: 'integration' },
      outputVariable: 'integration_test_result',
      when: { $var: 'run_integration_tests' }
    },
    {
      id: 'e2e-tests',
      type: StepType.CONDITION,
      condition: { $var: 'run_e2e_tests' },
      thenSteps: [
        {
          id: 'start-test-env',
          type: StepType.TOOL,
          toolName: 'run_command',
          arguments: { command: 'docker-compose up -d test-env' }
        },
        {
          id: 'run-e2e',
          type: StepType.TOOL,
          toolName: 'run_tests',
          arguments: { type: 'e2e' }
        },
        {
          id: 'stop-test-env',
          type: StepType.TOOL,
          toolName: 'run_command',
          arguments: { command: 'docker-compose down test-env' }
        }
      ]
    },
    {
      id: 'tests-checkpoint',
      type: StepType.CHECKPOINT,
      name: 'tests-passed'
    },
    
    // Deployment decision
    {
      id: 'deployment-decision',
      type: StepType.CONDITION,
      condition: {
        $and: [
          { $eq: [{ $var: 'branch' }, 'main'] },
          { $eq: [{ $var: 'auto_deploy' }, true] }
        ]
      },
      thenSteps: [
        {
          id: 'deploy-staging',
          type: StepType.TOOL,
          toolName: 'deploy',
          arguments: {
            environment: 'staging',
            version: { $var: 'build_id' }
          },
          outputVariable: 'staging_deploy'
        },
        {
          id: 'smoke-tests',
          type: StepType.TOOL,
          toolName: 'run_tests',
          arguments: { type: 'smoke', environment: 'staging' },
          onError: {
            strategy: RecoveryStrategy.FALLBACK,
            fallbackSteps: [
              {
                id: 'rollback-staging',
                type: StepType.TOOL,
                toolName: 'deploy',
                arguments: {
                  environment: 'staging',
                  version: { $var: 'previous_version' },
                  action: 'rollback'
                }
              }
            ]
          }
        },
        {
          id: 'production-approval',
          type: StepType.HUMAN_REVIEW,
          message: 'Staging deployment successful. Approve production deployment?',
          options: ['deploy-to-production', 'hold', 'cancel']
        },
        {
          id: 'deploy-production',
          type: StepType.TOOL,
          when: { $eq: [{ $var: 'review_result' }, 'deploy-to-production'] },
          toolName: 'deploy',
          arguments: {
            environment: 'production',
            version: { $var: 'build_id' },
            strategy: 'blue-green'
          }
        }
      ],
      elseSteps: [
        {
          id: 'skip-deploy-notification',
          type: StepType.TOOL,
          toolName: 'send_notification',
          arguments: {
            channel: 'builds',
            message: 'Build ${build_id} complete. Manual deployment required.'
          }
        }
      ]
    }
  ],
  {
    description: 'Automated CI/CD pipeline with staging and production deployment',
    version: '2.0.0',
    inputs: [
      { name: 'build_id', type: 'string', required: true },
      { name: 'branch', type: 'string', required: true },
      { name: 'auto_deploy', type: 'boolean', default: false },
      { name: 'run_integration_tests', type: 'boolean', default: true },
      { name: 'run_e2e_tests', type: 'boolean', default: false }
    ],
    outputs: [
      { name: 'build_result', from: 'build_result' },
      { name: 'test_coverage', from: 'unit_test_result.coverage' },
      { name: 'deployment_status', from: 'staging_deploy' }
    ],
    timeout: 3600000, // 1 hour
    errorHandling: {
      strategy: RecoveryStrategy.ROLLBACK,
      rollbackTo: 'build-complete'
    }
  }
);

/**
 * Automated Code Review Workflow
 * 
 * AI-assisted code review with human oversight
 */
const codeReviewWorkflow = new WorkflowDefinition(
  'code-review',
  'Automated Code Review Workflow',
  [
    // Fetch PR details
    {
      id: 'fetch-pr',
      type: StepType.TOOL,
      toolName: 'github_get_pr',
      serverName: 'github',
      arguments: {
        owner: { $var: 'repo_owner' },
        repo: { $var: 'repo_name' },
        pr_number: { $var: 'pr_number' }
      },
      outputVariable: 'pr_details'
    },
    
    // Get changed files
    {
      id: 'get-diff',
      type: StepType.TOOL,
      toolName: 'github_get_pr_diff',
      serverName: 'github',
      arguments: {
        owner: { $var: 'repo_owner' },
        repo: { $var: 'repo_name' },
        pr_number: { $var: 'pr_number' }
      },
      outputVariable: 'diff'
    },
    
    // Parallel analysis
    {
      id: 'parallel-analysis',
      type: StepType.PARALLEL,
      maxConcurrency: 4,
      steps: [
        {
          id: 'code-quality',
          type: StepType.SKILL,
          skillId: 'code-analysis',
          input: {
            type: 'quality',
            diff: { $var: 'diff' }
          },
          outputVariable: 'quality_report'
        },
        {
          id: 'security-review',
          type: StepType.SKILL,
          skillId: 'security-analysis',
          input: { diff: { $var: 'diff' } },
          outputVariable: 'security_report'
        },
        {
          id: 'performance-review',
          type: StepType.SKILL,
          skillId: 'performance-analysis',
          input: { diff: { $var: 'diff' } },
          outputVariable: 'performance_report'
        },
        {
          id: 'test-coverage-check',
          type: StepType.SKILL,
          skillId: 'coverage-analysis',
          input: {
            changed_files: { $var: 'diff.files' }
          },
          outputVariable: 'coverage_report'
        }
      ]
    },
    
    // Aggregate findings
    {
      id: 'aggregate-findings',
      type: StepType.SKILL,
      skillId: 'review-aggregator',
      input: {
        quality: { $var: 'quality_report' },
        security: { $var: 'security_report' },
        performance: { $var: 'performance_report' },
        coverage: { $var: 'coverage_report' }
      },
      outputVariable: 'aggregated_review'
    },
    
    // Determine review outcome
    {
      id: 'determine-outcome',
      type: StepType.CONDITION,
      condition: {
        $or: [
          { $gt: [{ $var: 'aggregated_review.critical_issues' }, 0] },
          { $gt: [{ $var: 'aggregated_review.security_vulnerabilities' }, 0] }
        ]
      },
      thenSteps: [
        {
          id: 'request-changes',
          type: StepType.TOOL,
          toolName: 'github_create_review',
          serverName: 'github',
          arguments: {
            owner: { $var: 'repo_owner' },
            repo: { $var: 'repo_name' },
            pr_number: { $var: 'pr_number' },
            event: 'REQUEST_CHANGES',
            body: { $var: 'aggregated_review.summary' },
            comments: { $var: 'aggregated_review.comments' }
          }
        }
      ],
      elseSteps: [
        {
          id: 'human-review-decision',
          type: StepType.CONDITION,
          condition: { $gt: [{ $var: 'aggregated_review.total_issues' }, 5] },
          thenSteps: [
            {
              id: 'request-human-review',
              type: StepType.HUMAN_REVIEW,
              message: 'Multiple issues found. Please review:\n${aggregated_review.summary}',
              options: ['approve-with-comments', 'request-changes', 'approve']
            }
          ],
          elseSteps: [
            {
              id: 'auto-approve',
              type: StepType.TOOL,
              toolName: 'github_create_review',
              serverName: 'github',
              arguments: {
                owner: { $var: 'repo_owner' },
                repo: { $var: 'repo_name' },
                pr_number: { $var: 'pr_number' },
                event: 'APPROVE',
                body: 'LGTM! Automated review passed.\n\n${aggregated_review.summary}'
              }
            }
          ]
        }
      ]
    },
    
    // Post review comments
    {
      id: 'post-comments',
      type: StepType.LOOP,
      items: { $var: 'aggregated_review.line_comments' },
      itemVariable: 'comment',
      steps: [
        {
          id: 'post-line-comment',
          type: StepType.TOOL,
          toolName: 'github_create_review_comment',
          serverName: 'github',
          arguments: {
            owner: { $var: 'repo_owner' },
            repo: { $var: 'repo_name' },
            pr_number: { $var: 'pr_number' },
            path: { $var: 'comment.file' },
            line: { $var: 'comment.line' },
            body: { $var: 'comment.body' }
          }
        }
      ],
      maxIterations: 50
    }
  ],
  {
    description: 'AI-powered code review with quality, security, and performance analysis',
    version: '1.0.0',
    inputs: [
      { name: 'repo_owner', type: 'string', required: true },
      { name: 'repo_name', type: 'string', required: true },
      { name: 'pr_number', type: 'number', required: true }
    ],
    outputs: [
      { name: 'review_summary', from: 'aggregated_review' },
      { name: 'critical_issues', from: 'aggregated_review.critical_issues' }
    ],
    retryPolicy: {
      maxRetries: 2,
      backoffMs: 3000
    }
  }
);

/**
 * Incident Response Workflow
 * 
 * Automated incident detection, triage, and resolution
 */
const incidentResponseWorkflow = new WorkflowDefinition(
  'incident-response',
  'Incident Response Workflow',
  [
    // Initial triage
    {
      id: 'classify-incident',
      type: StepType.SKILL,
      skillId: 'incident-classifier',
      input: {
        alert: { $var: 'alert_data' },
        service: { $var: 'affected_service' }
      },
      outputVariable: 'classification'
    },
    
    // Severity-based routing
    {
      id: 'severity-routing',
      type: StepType.CONDITION,
      condition: {
        $or: [
          { $eq: [{ $var: 'classification.severity' }, 'critical'] },
          { $eq: [{ $var: 'classification.severity' }, 'high'] }
        ]
      },
      thenSteps: [
        // Critical/High: Immediate response
        {
          id: 'page-oncall',
          type: StepType.PARALLEL,
          steps: [
            {
              id: 'send-pagerduty',
              type: StepType.TOOL,
              toolName: 'pagerduty_create_incident',
              arguments: {
                service: { $var: 'affected_service' },
                title: { $var: 'classification.title' },
                urgency: 'high'
              }
            },
            {
              id: 'create-incident-channel',
              type: StepType.TOOL,
              toolName: 'slack_create_channel',
              arguments: {
                name: 'incident-${incident_id}',
                topic: { $var: 'classification.title' }
              },
              outputVariable: 'incident_channel'
            }
          ]
        },
        {
          id: 'gather-diagnostics',
          type: StepType.PARALLEL,
          steps: [
            {
              id: 'fetch-logs',
              type: StepType.TOOL,
              toolName: 'fetch_logs',
              arguments: {
                service: { $var: 'affected_service' },
                timeRange: '15m',
                level: 'error'
              },
              outputVariable: 'error_logs'
            },
            {
              id: 'fetch-metrics',
              type: StepType.TOOL,
              toolName: 'fetch_metrics',
              arguments: {
                service: { $var: 'affected_service' },
                timeRange: '1h'
              },
              outputVariable: 'metrics'
            },
            {
              id: 'check-dependencies',
              type: StepType.TOOL,
              toolName: 'check_service_health',
              arguments: {
                services: { $var: 'classification.dependencies' }
              },
              outputVariable: 'dependency_health'
            }
          ]
        },
        {
          id: 'ai-diagnosis',
          type: StepType.SKILL,
          skillId: 'incident-diagnosis',
          input: {
            logs: { $var: 'error_logs' },
            metrics: { $var: 'metrics' },
            dependencies: { $var: 'dependency_health' },
            classification: { $var: 'classification' }
          },
          outputVariable: 'diagnosis'
        },
        {
          id: 'post-diagnosis',
          type: StepType.TOOL,
          toolName: 'slack_post_message',
          arguments: {
            channel: { $var: 'incident_channel.id' },
            blocks: { $var: 'diagnosis.slack_blocks' }
          }
        }
      ],
      elseSteps: [
        // Medium/Low: Create ticket
        {
          id: 'create-ticket',
          type: StepType.TOOL,
          toolName: 'jira_create_issue',
          arguments: {
            project: 'OPS',
            type: 'Bug',
            summary: { $var: 'classification.title' },
            priority: { $var: 'classification.jira_priority' }
          },
          outputVariable: 'ticket'
        },
        {
          id: 'notify-team',
          type: StepType.TOOL,
          toolName: 'slack_post_message',
          arguments: {
            channel: '#ops-alerts',
            text: 'New incident: ${classification.title}\nTicket: ${ticket.key}'
          }
        }
      ]
    },
    
    // Resolution attempt
    {
      id: 'attempt-auto-resolution',
      type: StepType.CONDITION,
      condition: {
        $and: [
          { $exists: 'diagnosis.auto_remediation' },
          { $eq: [{ $var: 'classification.auto_remediation_allowed' }, true] }
        ]
      },
      thenSteps: [
        {
          id: 'execute-remediation',
          type: StepType.LOOP,
          items: { $var: 'diagnosis.remediation_steps' },
          itemVariable: 'step',
          steps: [
            {
              id: 'run-remediation-step',
              type: StepType.TOOL,
              toolName: { $var: 'step.tool' },
              arguments: { $var: 'step.arguments' },
              onError: {
                strategy: RecoveryStrategy.MANUAL,
                message: 'Remediation step failed: ${step.name}'
              }
            }
          ]
        },
        {
          id: 'verify-resolution',
          type: StepType.TOOL,
          toolName: 'check_service_health',
          arguments: {
            services: [{ $var: 'affected_service' }]
          },
          outputVariable: 'post_remediation_health'
        }
      ]
    },
    
    // Post-incident
    {
      id: 'finalize-incident',
      type: StepType.PARALLEL,
      steps: [
        {
          id: 'update-status-page',
          type: StepType.TOOL,
          toolName: 'statuspage_update',
          arguments: {
            incident_id: { $var: 'incident_id' },
            status: 'resolved'
          }
        },
        {
          id: 'schedule-postmortem',
          type: StepType.TOOL,
          when: { $eq: [{ $var: 'classification.severity' }, 'critical'] },
          toolName: 'calendar_create_event',
          arguments: {
            title: 'Postmortem: ${classification.title}',
            duration: 60,
            attendees: { $var: 'classification.stakeholders' }
          }
        }
      ]
    }
  ],
  {
    description: 'Automated incident response with AI-powered diagnosis and remediation',
    version: '1.0.0',
    inputs: [
      { name: 'incident_id', type: 'string', required: true },
      { name: 'alert_data', type: 'object', required: true },
      { name: 'affected_service', type: 'string', required: true }
    ],
    outputs: [
      { name: 'classification', from: 'classification' },
      { name: 'diagnosis', from: 'diagnosis' },
      { name: 'resolution_status', from: 'post_remediation_health' }
    ],
    errorHandling: {
      strategy: RecoveryStrategy.MANUAL
    }
  }
);

/**
 * Data Pipeline Workflow
 * 
 * ETL/ELT pipeline with quality checks and monitoring
 */
const dataPipelineWorkflow = new WorkflowDefinition(
  'data-pipeline',
  'Data Pipeline Workflow',
  [
    // Extract
    {
      id: 'extract-data',
      type: StepType.PARALLEL,
      steps: [
        {
          id: 'extract-source-a',
          type: StepType.TOOL,
          toolName: 'data_extract',
          arguments: {
            source: { $var: 'source_a_config' },
            query: { $var: 'source_a_query' }
          },
          outputVariable: 'data_a',
          retry: { maxRetries: 3, backoffMs: 5000 }
        },
        {
          id: 'extract-source-b',
          type: StepType.TOOL,
          toolName: 'data_extract',
          arguments: {
            source: { $var: 'source_b_config' },
            query: { $var: 'source_b_query' }
          },
          outputVariable: 'data_b',
          retry: { maxRetries: 3, backoffMs: 5000 }
        }
      ]
    },
    {
      id: 'extraction-checkpoint',
      type: StepType.CHECKPOINT,
      name: 'extraction-complete'
    },
    
    // Data quality checks
    {
      id: 'quality-checks',
      type: StepType.PARALLEL,
      steps: [
        {
          id: 'check-completeness',
          type: StepType.SKILL,
          skillId: 'data-quality',
          input: {
            check: 'completeness',
            data: [{ $var: 'data_a' }, { $var: 'data_b' }],
            thresholds: { $var: 'quality_thresholds' }
          },
          outputVariable: 'completeness_result'
        },
        {
          id: 'check-consistency',
          type: StepType.SKILL,
          skillId: 'data-quality',
          input: {
            check: 'consistency',
            data: [{ $var: 'data_a' }, { $var: 'data_b' }]
          },
          outputVariable: 'consistency_result'
        },
        {
          id: 'check-freshness',
          type: StepType.SKILL,
          skillId: 'data-quality',
          input: {
            check: 'freshness',
            data: [{ $var: 'data_a' }, { $var: 'data_b' }],
            maxAge: { $var: 'max_data_age' }
          },
          outputVariable: 'freshness_result'
        }
      ]
    },
    
    // Quality gate
    {
      id: 'quality-gate',
      type: StepType.CONDITION,
      condition: {
        $and: [
          { $var: 'completeness_result.passed' },
          { $var: 'consistency_result.passed' },
          { $var: 'freshness_result.passed' }
        ]
      },
      thenSteps: [
        // Transform
        {
          id: 'transform-data',
          type: StepType.SKILL,
          skillId: 'data-transform',
          input: {
            sources: {
              a: { $var: 'data_a' },
              b: { $var: 'data_b' }
            },
            transformations: { $var: 'transform_config' }
          },
          outputVariable: 'transformed_data'
        },
        {
          id: 'transform-checkpoint',
          type: StepType.CHECKPOINT,
          name: 'transform-complete'
        },
        
        // Load
        {
          id: 'load-data',
          type: StepType.TOOL,
          toolName: 'data_load',
          arguments: {
            destination: { $var: 'destination_config' },
            data: { $var: 'transformed_data' },
            mode: { $var: 'load_mode' }
          },
          outputVariable: 'load_result',
          onError: {
            strategy: RecoveryStrategy.ROLLBACK,
            rollbackTo: 'transform-complete'
          }
        },
        
        // Post-load validation
        {
          id: 'validate-load',
          type: StepType.TOOL,
          toolName: 'data_validate',
          arguments: {
            destination: { $var: 'destination_config' },
            expectedRows: { $var: 'transformed_data.rowCount' }
          },
          outputVariable: 'validation_result'
        }
      ],
      elseSteps: [
        {
          id: 'quality-failure-alert',
          type: StepType.TOOL,
          toolName: 'send_alert',
          arguments: {
            channel: '#data-alerts',
            severity: 'high',
            message: 'Data quality check failed',
            details: {
              completeness: { $var: 'completeness_result' },
              consistency: { $var: 'consistency_result' },
              freshness: { $var: 'freshness_result' }
            }
          }
        },
        {
          id: 'quality-human-review',
          type: StepType.HUMAN_REVIEW,
          message: 'Data quality check failed. Review and decide:',
          options: ['proceed-anyway', 'retry-extraction', 'abort']
        }
      ]
    },
    
    // Metrics and reporting
    {
      id: 'record-metrics',
      type: StepType.TOOL,
      toolName: 'metrics_record',
      arguments: {
        pipeline: { $var: 'pipeline_name' },
        metrics: {
          rowsProcessed: { $var: 'load_result.rowsInserted' },
          duration: { $var: '__duration' },
          qualityScores: {
            completeness: { $var: 'completeness_result.score' },
            consistency: { $var: 'consistency_result.score' }
          }
        }
      }
    }
  ],
  {
    description: 'ETL/ELT data pipeline with quality gates and monitoring',
    version: '1.0.0',
    inputs: [
      { name: 'pipeline_name', type: 'string', required: true },
      { name: 'source_a_config', type: 'object', required: true },
      { name: 'source_a_query', type: 'string', required: true },
      { name: 'source_b_config', type: 'object', required: true },
      { name: 'source_b_query', type: 'string', required: true },
      { name: 'destination_config', type: 'object', required: true },
      { name: 'transform_config', type: 'object', required: true },
      { name: 'quality_thresholds', type: 'object', required: false },
      { name: 'max_data_age', type: 'string', default: '24h' },
      { name: 'load_mode', type: 'string', default: 'append' }
    ],
    outputs: [
      { name: 'load_result', from: 'load_result' },
      { name: 'validation', from: 'validation_result' },
      { name: 'quality_report', from: 'quality_gate_results' }
    ],
    timeout: 7200000, // 2 hours
    errorHandling: {
      strategy: RecoveryStrategy.ROLLBACK,
      rollbackTo: 'extraction-complete'
    }
  }
);

/**
 * Workflow template factory
 */
function createWorkflowFromTemplate(templateName, customizations = {}) {
  const templates = {
    'feature-development': featureDevelopmentWorkflow,
    'cicd-pipeline': cicdPipelineWorkflow,
    'code-review': codeReviewWorkflow,
    'incident-response': incidentResponseWorkflow,
    'data-pipeline': dataPipelineWorkflow
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Unknown workflow template: ${templateName}`);
  }

  // Clone and customize
  const workflow = new WorkflowDefinition(
    customizations.id || template.id,
    customizations.name || template.name,
    customizations.steps || template.steps,
    {
      description: customizations.description || template.description,
      version: customizations.version || template.version,
      inputs: customizations.inputs || template.inputs,
      outputs: customizations.outputs || template.outputs,
      errorHandling: customizations.errorHandling || template.errorHandling,
      timeout: customizations.timeout || template.timeout,
      retryPolicy: customizations.retryPolicy || template.retryPolicy
    }
  );

  return workflow;
}

module.exports = {
  // Individual workflows
  featureDevelopmentWorkflow,
  cicdPipelineWorkflow,
  codeReviewWorkflow,
  incidentResponseWorkflow,
  dataPipelineWorkflow,
  
  // Factory
  createWorkflowFromTemplate,
  
  // Re-export types
  StepType,
  RecoveryStrategy
};

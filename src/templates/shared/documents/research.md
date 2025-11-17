# Research Report: {{TOPIC}}

**Project**: {{PROJECT_NAME}}
**Version**: 1.0
**Status**: Draft
**Date**: {{DATE}}
**Researcher**: {{AUTHOR}}

---

## Document Control

| Version | Date     | Author     | Changes          |
| ------- | -------- | ---------- | ---------------- |
| 1.0     | {{DATE}} | {{AUTHOR}} | Initial research |

---

## Executive Summary

[2-3 paragraph summary of research findings and recommendation]

**Key Findings**:

- [Finding 1]
- [Finding 2]
- [Finding 3]

**Recommendation**: [Primary recommendation with brief justification]

---

## Research Questions

### Primary Question

[Main question this research aims to answer]

### Secondary Questions

1. [Question 1]
2. [Question 2]
3. [Question 3]

---

## Background

### Context

[Project context and why this research is needed]

**Steering Context**:

- **Product Goals**: [Reference to steering/product.md]
- **Architecture Patterns**: [Reference to steering/structure.md]
- **Current Tech Stack**: [Reference to steering/tech.md]

### Scope

**In Scope**:

- [Topic 1]
- [Topic 2]

**Out of Scope**:

- [Topic 1]
- [Topic 2]

---

## Methodology

### Research Approach

[How the research was conducted]

**Methods Used**:

- [ ] Literature review (documentation, blog posts, papers)
- [ ] Code analysis (existing codebase, open-source examples)
- [ ] Prototyping/proof of concept
- [ ] Expert consultation (team members, community)
- [ ] Benchmark testing
- [ ] Market analysis

### Evaluation Criteria

| Criterion            | Weight | Description                                |
| -------------------- | ------ | ------------------------------------------ |
| Technical Fit        | 30%    | Alignment with tech stack and architecture |
| Developer Experience | 20%    | Ease of use, learning curve                |
| Performance          | 15%    | Speed, resource usage                      |
| Community Support    | 15%    | Documentation, ecosystem, maturity         |
| Cost                 | 10%    | Licensing, hosting, maintenance            |
| Security             | 10%    | Vulnerabilities, update frequency          |

**Total**: 100%

---

## Options Analyzed

### Option 1: [Name]

**Description**: [Brief description of the option]

**Website**: [URL]
**License**: [e.g., MIT, Apache 2.0, Proprietary]
**Version**: [Current stable version]
**Maturity**: [Mature/Stable/Beta/Alpha]

#### Pros

- ✅ [Advantage 1]
- ✅ [Advantage 2]
- ✅ [Advantage 3]

#### Cons

- ❌ [Disadvantage 1]
- ❌ [Disadvantage 2]
- ❌ [Disadvantage 3]

#### Technical Details

**Language/Framework**: [e.g., TypeScript, Python, Go]
**Dependencies**: [Major dependencies]
**Integration**: [How it integrates with existing stack]

**Example Usage**:

```typescript
// Code example showing how to use this option
import { Feature } from 'option1';

const feature = new Feature({
  config: 'value',
});

const result = await feature.execute();
```

#### Evaluation Scores

| Criterion            | Score (1-10) | Weight | Weighted Score | Notes   |
| -------------------- | ------------ | ------ | -------------- | ------- |
| Technical Fit        | [N]          | 30%    | [N×0.3]        | [Notes] |
| Developer Experience | [N]          | 20%    | [N×0.2]        | [Notes] |
| Performance          | [N]          | 15%    | [N×0.15]       | [Notes] |
| Community Support    | [N]          | 15%    | [N×0.15]       | [Notes] |
| Cost                 | [N]          | 10%    | [N×0.1]        | [Notes] |
| Security             | [N]          | 10%    | [N×0.1]        | [Notes] |
| **Total**            | -            | 100%   | **[Sum]**      | -       |

#### Community Metrics

- **GitHub Stars**: [N]
- **NPM Downloads**: [N/week or N/month]
- **Contributors**: [N]
- **Last Release**: [Date]
- **Open Issues**: [N]
- **Documentation Quality**: [Excellent/Good/Fair/Poor]

#### Use Cases

**Best For**:

- [Use case 1]
- [Use case 2]

**Not Suitable For**:

- [Use case 1]
- [Use case 2]

---

### Option 2: [Name]

[Repeat the same structure as Option 1]

**Description**: [Brief description]

**Website**: [URL]
**License**: [License]
**Version**: [Version]
**Maturity**: [Maturity level]

#### Pros

- ✅ [Advantage 1]
- ✅ [Advantage 2]

#### Cons

- ❌ [Disadvantage 1]
- ❌ [Disadvantage 2]

#### Technical Details

[Same structure as Option 1]

#### Evaluation Scores

[Same table as Option 1]

#### Community Metrics

[Same structure as Option 1]

---

### Option 3: [Name]

[Repeat structure]

---

## Comparison Matrix

| Feature/Criterion        | Option 1     | Option 2 | Option 3     | Winner       |
| ------------------------ | ------------ | -------- | ------------ | ------------ |
| **Technical Fit**        | 8/10         | 7/10     | 9/10         | Option 3     |
| **Developer Experience** | 9/10         | 6/10     | 7/10         | Option 1     |
| **Performance**          | 7/10         | 9/10     | 8/10         | Option 2     |
| **Community Support**    | 9/10         | 7/10     | 6/10         | Option 1     |
| **Cost**                 | 10/10 (free) | 8/10     | 10/10 (free) | Option 1, 3  |
| **Security**             | 8/10         | 7/10     | 9/10         | Option 3     |
| **Weighted Total**       | **8.3**      | **7.5**  | **8.0**      | **Option 1** |

---

## Feature Comparison

| Feature     | Option 1 | Option 2 | Option 3 | Required? |
| ----------- | -------- | -------- | -------- | --------- |
| [Feature 1] | ✅       | ✅       | ❌       | Yes       |
| [Feature 2] | ✅       | ❌       | ✅       | Yes       |
| [Feature 3] | ❌       | ✅       | ✅       | No        |
| [Feature 4] | ✅       | ✅       | ✅       | Yes       |
| [Feature 5] | Partial  | ✅       | ✅       | No        |

**Legend**: ✅ Supported | ❌ Not supported | Partial = Limited support

---

## Performance Benchmarks

### Benchmark Setup

**Environment**:

- CPU: [e.g., Intel i7, Apple M1]
- RAM: [e.g., 16GB]
- OS: [e.g., macOS, Ubuntu 22.04]
- Node.js: [e.g., v20.10.0]

**Test Scenario**: [Description of what was tested]

### Results

| Metric                   | Option 1 | Option 2 | Option 3 | Winner   |
| ------------------------ | -------- | -------- | -------- | -------- |
| **Throughput** (ops/sec) | 10,000   | 15,000   | 12,000   | Option 2 |
| **Latency** (ms, p95)    | 50       | 30       | 40       | Option 2 |
| **Memory** (MB)          | 150      | 200      | 120      | Option 3 |
| **Bundle Size** (KB)     | 80       | 120      | 60       | Option 3 |
| **Startup Time** (ms)    | 200      | 300      | 150      | Option 3 |

**Benchmark Code**:

```typescript
// Code used for benchmarking
import Benchmark from 'benchmark';

const suite = new Benchmark.Suite();

suite
  .add('Option 1', () => {
    // Test code
  })
  .add('Option 2', () => {
    // Test code
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();
```

---

## Proof of Concept

### Option 1 POC

**Goal**: [What the POC aimed to prove]

**Implementation**:

```typescript
// Proof of concept code
```

**Results**:

- ✅ [Success criterion 1]
- ✅ [Success criterion 2]
- ❌ [Failed criterion 1]

**Time Investment**: [X hours]
**Verdict**: [Pass/Fail/Partial]

---

### Option 2 POC

[Same structure]

---

## Risk Analysis

### Option 1 Risks

| Risk     | Probability     | Impact          | Mitigation            |
| -------- | --------------- | --------------- | --------------------- |
| [Risk 1] | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |
| [Risk 2] | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |

### Option 2 Risks

[Same structure]

---

## Migration Considerations

### For Option 1

**If we choose Option 1, migration path**:

**Current State**: [Description of current implementation]
**Target State**: [Description after migration]

**Migration Steps**:

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Estimated Effort**: [X hours/days]
**Rollback Plan**: [How to revert if issues occur]

---

## Cost Analysis

| Cost Factor              | Option 1   | Option 2 | Option 3      |
| ------------------------ | ---------- | -------- | ------------- |
| **License Cost**         | Free (MIT) | $X/month | Free (Apache) |
| **Infrastructure**       | $X/month   | $Y/month | $Z/month      |
| **Development Time**     | X hours    | Y hours  | Z hours       |
| **Maintenance** (annual) | X hours    | Y hours  | Z hours       |
| **Training**             | Low        | Medium   | Low           |
| **Total 1st Year**       | **$X**     | **$Y**   | **$Z**        |

---

## Team Feedback

### Developer Survey

**Respondents**: [N team members]

**Question**: Which option do you prefer?

- Option 1: [N votes] ([%]%)
- Option 2: [N votes] ([%]%)
- Option 3: [N votes] ([%]%)

**Comments**:

- "[Developer 1 comment]"
- "[Developer 2 comment]"

---

## Recommendation

### Primary Recommendation: [Option X]

**Rationale**:

1. [Reason 1 - e.g., Highest weighted score (8.3/10)]
2. [Reason 2 - e.g., Best developer experience]
3. [Reason 3 - e.g., Strong community support]
4. [Reason 4 - e.g., Aligns with steering context]

**Trade-offs Accepted**:

- [Trade-off 1 - e.g., Slightly slower than Option 2]
- [Trade-off 2 - e.g., Smaller community than Option 1]

**Decision Confidence**: [High/Medium/Low]

---

### Alternative Recommendation: [Option Y]

**When to Use Instead**:

- If [condition 1 - e.g., performance is critical]
- If [condition 2 - e.g., budget is constrained]

---

## Next Steps

### Immediate Actions

1. [ ] **Stakeholder Review**: Present findings to [stakeholders]
2. [ ] **Decision**: Get approval on [recommended option]
3. [ ] **Spike**: Run 1-week spike to validate integration
4. [ ] **Requirements**: Create requirements document
5. [ ] **Design**: Create technical design document

### Timeline

| Phase            | Duration | Deadline |
| ---------------- | -------- | -------- |
| Research Review  | 2 days   | {{DATE}} |
| Decision         | 1 day    | {{DATE}} |
| Validation Spike | 1 week   | {{DATE}} |
| Requirements     | 3 days   | {{DATE}} |
| Design           | 1 week   | {{DATE}} |

---

## References

### Documentation

- [Option 1 Docs]: [URL]
- [Option 2 Docs]: [URL]
- [Option 3 Docs]: [URL]

### Articles & Blog Posts

- [Title 1]: [URL]
- [Title 2]: [URL]

### Code Examples

- [Example 1]: [GitHub URL]
- [Example 2]: [GitHub URL]

### Community Discussions

- [Discussion 1]: [URL]
- [Discussion 2]: [URL]

---

## Appendix A: Detailed Benchmarks

[Include raw benchmark data, graphs, charts]

---

## Appendix B: Code Samples

### Option 1 Complete Example

```typescript
// Complete working example
```

### Option 2 Complete Example

```typescript
// Complete working example
```

---

## Appendix C: Decision Framework

This research follows the decision framework from `steering/rules/workflow.md` Stage 1 (Research).

**Quality Gates**:

- ✅ Research questions answered
- ✅ Minimum 2 options evaluated
- ✅ Recommendations justified
- ✅ Stakeholders can review

**Constitutional Compliance**:

- ✅ **Article VI**: Consulted steering context (structure.md, tech.md, product.md)

---

## Document History

### Version 1.1 (Future)

- [Planned update 1]
- [Planned update 2]

---

**Powered by MUSUBI** - Specification Driven Development

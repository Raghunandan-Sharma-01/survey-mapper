# Survey Mapper - Optimization & Duplicate Detection Guide

## The Core Use Case

**The Problem You're Solving:**

When creating complex surveys with branching logic, developers and survey designers often:
- Lose track of which questions appear in which paths
- Accidentally ask the same question multiple times across different branches
- Create duplicate questions with different IDs (e.g., Q_email, Q_contact_email, Email_Address)
- Don't realize until conducting the survey that respondents are confused

**Survey Mapper's Solution:**

Provides a **visual map** of all survey paths so you can:
- See exactly which questions appear in each path
- Instantly spot repeated/duplicate questions
- Optimize by consolidating or repositioning questions
- Ensure a seamless experience for respondents

---

## Why Duplicates Matter

### The Respondent's Experience: Without Optimization

```
Customer Path:
Q1: "Are you a customer?" → Yes
Q2: "How long have you been a customer?" → 3 years
Q3: "What is your email?" → john@example.com
Q4: "What is your email?" → (confused) john@example.com again?
Q5: "How satisfied are you?" → 8/10

Non-Customer Path:
Q1: "Are you a customer?" → No
Q2: "Are you interested in becoming one?" → Yes
Q3: "What is your contact email?" → jane@example.com
Q4: "What is your email?" → (frustrated) just answered this!
Q5: "How satisfied are you?" → 5/10 (affected by frustration)
```

**Result:** Worse data quality due to repeated questions and respondent frustration.

### The Developer's Challenge: Tracking Paths Manually

```typescript
// Manually tracking paths without Survey Mapper is error-prone:

// "I think email is asked once..."
const emailCount = paths.filter(path => 
  path.includes("q_email") || 
  path.includes("q_contact_email") ||
  path.includes("email_address") ||  // Did I catch all variations?
  path.includes("Q3") ||              // Is Q3 email? I forgot...
  path.includes("contact_info")       // There's another?
).length;

// This approach is:
// ❌ Error-prone (easy to miss variations)
// ❌ Manual (must review code)
// ❌ Unmaintainable (changes aren't tracked)
// ❌ Non-visual (hard to understand relationships)
```

**Survey Mapper solves this with a visual dashboard.**

---

## How Survey Mapper Works: Step by Step

### Step 1: Parse the Survey
You upload a JSON file with all questions and their hierarchy.

```json
{
  "questions": [
    { "id": "q_customer_status", "name": "Are you a customer?", "type": "yes_no" },
    { "id": "q_years", "name": "How long?", "type": "multiple_choice" },
    { "id": "q_email", "name": "Email address", "type": "text" },
    { "id": "q_satisfaction", "name": "Satisfaction", "type": "rating" }
  ]
}
```

**What Survey Mapper does:**
- Extracts all questions
- Identifies structure (pages, sections)
- Prepares for logic definition

### Step 2: Define Branching Logic
You specify when each question should appear.

```
Q_years shows IF: q_customer_status = "Yes"
Q_satisfaction shows IF: q_customer_status = any value
Q_email shows IF: q_customer_status = any value
```

**What Survey Mapper does:**
- Builds a logic graph
- Calculates all possible paths
- Visualizes in the Logic Map

### Step 3: Analyze Paths & Spot Duplicates

**Survey Mapper shows you:**

```
Path Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Path 1 (Customer): q_customer_status → q_years → q_email → q_satisfaction
Path 2 (Non-Customer): q_customer_status → q_email → q_satisfaction

Questions appearing in:
├─ 100% of paths (2/2):  q_customer_status, q_email, q_satisfaction
└─ 50% of paths (1/2):   q_years

⚠️  Email is asked in EVERY path!
💡 Suggestion: Move email to beginning (before branching)
```

### Step 4: Optimize & Restructure

**Before Optimization:**
```
Q_customer_status
  ├─ Yes → Q_years → Q_email → Q_satisfaction
  └─ No  → Q_email → Q_satisfaction
              ↑
         Asked twice!
```

**After Optimization:**
```
Q_customer_status
├─ Q_email (asked for everyone)
  ├─ Yes → Q_years → Q_satisfaction
  └─ No  → Q_satisfaction
```

**Benefits:**
- ✅ 1 question removed from flow
- ✅ No repeated questions
- ✅ Clearer logic
- ✅ Better respondent experience

---

## Real-World Examples

### Example 1: E-commerce Customer Survey

**Scenario:**
- Survey for customers and non-customers
- Customers branch into active/inactive
- Different questions for each group

**Survey Setup:**
```
Q1: Are you a customer?
  ├─ Yes
  │  ├─ Q2: How often do you purchase?
  │  │  ├─ Weekly/Monthly → Q3: Favorite category
  │  │  └─ Rarely → Q4: Any issues?
  │  └─ Q5: Email (for future offers)
  │     └─ Q6: Satisfaction
  │
  └─ No
     ├─ Q7: Interested in joining?
     ├─ Q5: Email (for newsletter) ← DUPLICATE!
     └─ Q6: Satisfaction
```

**Analysis with Survey Mapper:**
```
Repeated Questions:
- Q5 (Email): appears in 100% of paths (2/2)
- Q6 (Satisfaction): appears in 100% of paths (2/2)

Optimization:
Move Q5 & Q6 to after Q1 (before branching)
```

**Optimized Flow:**
```
Q1: Are you a customer?
├─ Q5: Email
├─ Q6: Satisfaction
  ├─ Yes → Q2: Purchase frequency → Q3 or Q4
  └─ No  → Q7: Interested?
```

### Example 2: Job Application Survey

**Problem:**
- Different paths for senior/junior applicants
- "Years of experience" hidden in multiple places

**Before Survey Mapper:**
```
Q1: Experience level?
├─ Senior
│  ├─ Q2: Current salary
│  ├─ Q3: Team size managed
│  └─ Q6: Years of experience ← Asked here
└─ Junior
   ├─ Q4: Current title
   ├─ Q5: Learning interests
   └─ Q6: Years of experience ← And here!
```

**Survey Mapper reveals:**
- Q6 appears in 100% of paths
- Should be asked once at start

**After Optimization:**
```
Q6: Years of experience (asked first)
Q1: Experience level?
├─ Senior → Q2 → Q3
└─ Junior → Q4 → Q5
```

---

## For Programmers: Implementation Details

### Detecting Duplicates Programmatically

```typescript
// Algorithm 1: Find questions appearing in multiple paths
function findRepeatedQuestions(paths: string[][], questions: Question[]) {
  const frequency = new Map<string, number>();
  
  paths.forEach(path => {
    new Set(path).forEach(questionId => {
      frequency.set(questionId, (frequency.get(questionId) || 0) + 1);
    });
  });
  
  return Array.from(frequency.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);  // Most repeated first
}

// Usage
const repeated = findRepeatedQuestions(surveyPaths, questions);
repeated.forEach(([qId, count]) => {
  console.log(`"${getQuestionName(qId)}" appears in ${count}/${surveyPaths.length} paths`);
});
```

### Visualizing Duplicates in ReactFlow

```typescript
// Color-code nodes based on how many paths they appear in
function getNodeColor(questionId: string, paths: string[][], totalPaths: number) {
  const appearsIn = paths.filter(p => p.includes(questionId)).length;
  const percentage = appearsIn / totalPaths;
  
  if (percentage === 1) return "#27ae60";      // Green - in all paths
  if (percentage >= 0.5) return "#f39c12";    // Orange - in most
  if (percentage >= 0.2) return "#e67e22";    // Red - in few
  return "#3498db";                            // Blue - unique
}
```

### Generating Optimization Reports

```typescript
function generateOptimizationReport(survey: SurveyData) {
  const paths = calculateAllPaths(survey);
  const repeated = findRepeatedQuestions(paths, survey.questions);
  
  const report = {
    totalPaths: paths.length,
    optimizationOpportunities: [],
    
    // Questions that should move to start
    consolidationCandidates: repeated
      .filter(([_, count]) => count / paths.length > 0.7)
      .map(([qId, count]) => ({
        question: getQuestion(qId),
        appearsIn: `${(count / paths.length * 100).toFixed(0)}% of paths`,
        action: "Move before branching"
      }))
  };
  
  return report;
}
```

---

## For Survey Designers: Best Practices

### Phase 1: Build Your Survey
1. List all questions you need to ask
2. Define who should answer each question (customer/non-customer, etc.)
3. Note any questions that apply to everyone

### Phase 2: Upload to Survey Mapper
1. Format survey as JSON
2. Upload to Survey Mapper
3. Define branching logic in Editor View

### Phase 3: Analyze with Logic Map
1. Switch to Logic Map View
2. Review each path visually
3. Use the path selector to trace specific journeys

### Phase 4: Optimize
1. Identify repeated questions (Survey Mapper highlights them)
2. Decide: Consolidate or keep separate?
3. Adjust logic as needed

### Phase 5: Validate
1. Go through each path one more time
2. Make sure flow makes sense
3. Confirm no surprises for respondents

---

## Common Patterns & Solutions

### Pattern 1: Demographic Questions

❌ **Bad:**
```
Path A: Q1 → Q_age → Q_location → Q_feedback
Path B: Q1 → Q_age → Q_department → Q_feedback
Path C: Q1 → Q_age → Q_salary → Q_feedback
Q_age is repeated!
```

✅ **Good:**
```
Q1 → Q_age → Q_location_or_department_or_salary → Q_feedback
Ask demographics once, then branch
```

### Pattern 2: Satisfaction/Feedback Questions

❌ **Bad:**
```
Path A: ... → Q_satisfaction → Q_comments
Path B: ... → Q_rating → Q_comments  (different satisfaction question!)
Path C: ... → Q_nps → Q_comments    (another variation!)
```

✅ **Good:**
```
... → Q_satisfaction → Q_comments
Use ONE satisfaction question for all respondents
```

### Pattern 3: Contact Information

❌ **Bad:**
```
Path A: Q_name → ... → Q_email → Q_phone
Path B: Q_name → ... → Q_email → Q_mailing_address
                        ↑
                   Email asked in both!
```

✅ **Good:**
```
Q_name → Q_email → [Path-specific follow-ups]
Ask contact info upfront
```

---

## Measuring Success

### KPIs Before Optimization

- Survey completion rate: 65%
- Average questions seen: 8/12
- Comments about "duplicate questions": 12%

### KPIs After Optimization

- Survey completion rate: 78% ↑
- Average questions seen: 6/10 (shorter!)
- Comments about "duplicate questions": 0% ↓
- Respondent satisfaction: improved

### Questions to Ask

1. **Are we asking the same thing twice?** Survey Mapper shows this visually
2. **Can this question move earlier?** If it appears in 80% of paths, probably yes
3. **Should this question be path-specific?** Check if it's in every path
4. **Are we confusing respondents?** Removing duplicates helps

---

## Summary

**Survey Mapper helps you:**

1. 🔍 **See all paths visually** - Stop losing track of branching logic
2. 🔄 **Identify repeated questions** - Spot when same question appears multiple times
3. ✂️ **Optimize your survey** - Remove redundancy, shorten length
4. 😊 **Improve experience** - Fewer confusing repeated questions
5. 📊 **Better data quality** - Respondents aren't frustrated by duplicates

**The workflow:**
```
Upload → Define Logic → Visualize Paths → Spot Duplicates → Optimize → Validate
```

**The goal:**
```
Shorter surveys + Better UX + Cleaner data = Higher quality insights
```


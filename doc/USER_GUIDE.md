# Survey Mapper - User's Guide

## What is Survey Mapper?

**Survey Mapper** is a tool that helps you design and visualize **intelligent surveys** that adapt based on what people answer.

Instead of asking every question to everyone, Survey Mapper lets you create surveys that:
- Skip questions that don't apply
- Branch to different questions based on responses
- Show different paths based on user answers
- End early when you have all the information you need

Think of it like a **flowchart for surveys** – you can see exactly which questions will appear for different types of respondents.

---

## What Problems Does It Solve?

### Problem 1: Confusing Surveys
Traditional surveys ask all questions even if they don't apply to everyone.

**Example (Without Survey Mapper):**
```
Q1: Are you a car owner?
A: No

Q2: What color is your car?  ← Doesn't make sense! I don't own a car!
```

**With Survey Mapper:**
```
Q1: Are you a car owner?
└─ If "Yes" → Show Q2 (What color?)
└─ If "No" → Skip to Q3
```

### Problem 2: Hard to Manage Complex Logic
When surveys have many conditions, it's easy to lose track of which questions should appear when.

Survey Mapper shows you a **visual map** of all the different survey paths, so you can see every possible journey through your survey.

### Problem 3: Repeated Questions Across Different Paths
When you have branching logic, the **same question might appear in multiple paths**. Without visualization, you don't realize you're asking the same question multiple times.

**Example (Without Survey Mapper):**
```
Path A: Q1 → Q2 → Q4 → Q6 → "Email Address" → Q8
Path B: Q1 → Q3 → Q5 → Q7 → "Email Address" → Q8
         ↑                    ↑
         Both paths end up asking for email!
```

You might have:
- Forgotten you already asked for email in another path
- Created multiple "Email" questions with different IDs (Q6_email, Q7_email, etc.)
- Made the survey confusing by asking the same thing twice

**With Survey Mapper:**
```
You can instantly see that "Email Address" appears in multiple paths.
Decide: Should it appear once (after Q1)? Or does it belong in each path?
Eliminate redundancy → Shorter, clearer survey → Better response rates
```

---

## Why This Matters

When survey paths get complex, respondents can take different routes and encounter:
- Questions they've already answered earlier
- Confusing duplicate questions that seem like mistakes
- Unnecessary questions that should have been skipped

**Survey Mapper solves this by:**
1. **Visualizing ALL paths** - See every possible journey through your survey
2. **Identifying repeats** - Spot questions that appear in multiple paths
3. **Optimizing flow** - Decide if questions should be consolidated
4. **Remembering logic** - You don't have to mentally track complex branching

---

## Getting Started

### Step 1: Prepare Your Survey
You need a survey in **JSON format** (a computer-readable file).

Your survey needs to include:
- Questions and their IDs
- Survey structure (pages, sections)
- Any existing logic or branching

### Step 2: Upload Your Survey
1. Click the **"Upload JSON"** button at the top
2. Select your survey file
3. Survey Mapper analyzes it and displays all the questions

### Step 3: Design Your Logic
Now you can add rules like:
- "Only show this question if they answered 'Yes' to the previous question"
- "Skip this section if they're not interested"
- "End the survey if they choose to opt-out"

### Step 4: Review & Optimize Paths
Once you've added logic:
1. Switch to **Logic Map** to see all paths visually
2. Identify questions that appear in **multiple paths**
3. Decide: Can these be consolidated? Are they necessary in each path?
4. Make adjustments to eliminate redundancy

---

## The Two Views

### View 1: **Editor View** (Left Side)
This is where you **build and customize** your survey logic.

**What you see:**
- A list of questions
- Sections and subsections
- Editor panels to add rules

**What you do:**
- Click a question to select it
- Define when that question should appear
- Set conditions using IF/THEN logic
- See a readable description of the rule

**Example Editor Panel:**
```
Show this question IF:
┌─────────────────────────────┐
│ Question: "Are you a member?"     │
│ Condition: equals "Yes"        │
│ [Add Another Condition]        │
└─────────────────────────────┘
```

### View 2: **Logic Map** (Right Side)
This is where you **visualize** all the different survey paths.

**What you see:**
- A graph showing questions as boxes (nodes)
- Arrows showing connections between questions
- Different colors for different paths

**What you do:**
- Click and drag to explore the map
- Select a specific path to highlight it
- See how questions connect based on your rules

**Example Map:**
```
          Q1: Are you a member?
              /            \
           Yes              No
          /                  \
    Q2: Membership ID     Q3: Interested in joining?
        |                      /            \
        |                     Yes            No
        |                    /               |
        |               Q4: Email           [End]
        |              |
        └──────────────┘
                |
           Q5: Thank You
```

---

## How to Add Logic

### Basic Concept: IF → THEN

You define rules using simple logic:
- **IF** [some condition is true]
- **THEN** [do this action]

### Types of Rules

#### 1. **Show/Hide Questions**
**Use Case:** Only ask for email if they said "Yes"

**Rule:**
```
IF: Question "Interested?" = "Yes"
THEN: Show "Email Address" question
```

**In the Survey:**
- User answers "Interested?" → "Yes"
- "Email Address" appears
- User answers "Interested?" → "No"  
- "Email Address" is hidden

#### 2. **Skip Entire Sections**
**Use Case:** Skip the "Work Experience" section for students

**Rule:**
```
IF: Question "Are you a student?" = "Yes"
THEN: Skip "Work Experience" section
```

#### 3. **Multiple Conditions**
**Use Case:** Only show question if TWO things are true

**Rule:**
```
IF: (Question "Age" > 18) AND (Question "Country" = "USA")
THEN: Show "Legal Consent" question
```

**Operators:**
- **AND** = Both conditions must be true
- **OR** = At least one condition must be true

#### 4. **End Survey Early**
**Use Case:** End if they opt-out

**Rule:**
```
IF: Question "Continue Survey?" = "No"
THEN: End Survey (terminate)
```

---

## Comparison Operators

When building conditions, you can use different types of checks:

| Operator | Meaning | Example |
|----------|---------|---------|
| **Selected** | Answer equals this value | "Do you smoke?" = "No" |
| **Not Selected** | Answer is NOT this value | "Age" ≠ "Under 18" |
| **Greater Than** (>) | Number is bigger | "Income" > 50000 |
| **Less Than** (<) | Number is smaller | "Years experience" < 5 |
| **Greater or Equal** (≥) | Number is bigger or equal | "Score" ≥ 80 |
| **Less or Equal** (≤) | Number is smaller or equal | "Age" ≤ 65 |
| **In** | One of many values | "Favorite color" in ["Blue", "Green", "Red"] |
| **All** | All values selected | "Skills" includes all ["Java", "Python", "JavaScript"] |

---

## Step-by-Step Example

### Scenario
You're creating a customer feedback survey:
- Q1: "Are you a current customer?" (Yes/No)
- Q2: "How long have you been a customer?" (1-5 years / 5+ years)
- Q3: "What is your main complaint?" (text)
- Q4: "How would you rate your experience?" (1-10 scale)

### Your Logic Goals
1. Q2 should only appear if they answered "Yes" to Q1
2. Q3 should only appear if they answered "1-5 years" to Q2
3. Q4 should appear for all customers (after Q2)

### In Survey Mapper

**Step 1: Click Q2 in the editor**
```
Show this question IF:
├─ Question: "Are you a current customer?"
└─ Equals: "Yes"
```

**Step 2: Click Q3 in the editor**
```
Show this question IF:
├─ Question: "How long have you been a customer?"
└─ Equals: "1-5 years"
```

**Step 3: Click Q4 in the editor**
```
Show this question IF:
├─ Question: "Are you a current customer?"
└─ Equals: "Yes"
```

**Result:** The Logic Map now shows:
```
Q1: Are you a current customer?
       /          \
     Yes           No
     |             |
   Q2: How long?  [End]
    /   \
1-5yr  5+yr
 |      |
Q3     Q4
 \    /
   Q4: Rating
```

---

## Reading the Logic Map

### What the Boxes Mean
- **Boxes with question text** = Questions
- **Arrows with labels** = Paths based on answers
- **Different colors** = Different survey paths

### What the Connections Mean
- A path from Q1 to Q2 = "If user answers Q1, they might get Q2"
- Multiple paths from one question = Different outcomes based on the answer
- No connection = Question won't show in that path

### Highlighting Paths
- Click "Select Path" dropdown to see specific paths
- Example: "If I answer 'Yes' to Q1 and '1-5 years' to Q2, what questions do I get?"
- The path highlights showing exactly which questions appear

---

## 🎯 Finding & Eliminating Duplicate Questions

This is one of the **most powerful features** of Survey Mapper. When you have branching logic, it's easy to accidentally ask the same question multiple times across different paths.

### How to Spot Duplicates

**In the Logic Map:**
1. Look at your graph and trace through different paths
2. Do you see the same question box appearing in multiple paths?
3. Are there similar-sounding questions (e.g., "Email", "Email Address", "Contact Email")?

**Example - Duplicates:**
```
                    Q1: Type of Customer?
                   /                  \
              Corporate            Individual
                /                       \
            Q2A: Company Size      Q2B: Annual Income
               /                       /
            Q3: Email Address    Q3: Email Address  ← SAME Q!
               \                       /
                \                     /
                   Q4: Feedback
```

### Decision Time: Should This Be Duplicated?

Ask yourself:

| Question | If "Yes" | If "No" |
|----------|----------|---------|
| Is this question asked in every possible path? | Move it BEFORE the branch (ask once) | Keep it where it is |
| Do different paths need different versions? | Keep separate | Consolidate into one |
| Is it essential for that specific path? | Keep it | Remove & ask earlier |
| Could different respondents have different answers? | Keep it | Merge questions |

### Example: Optimizing a Survey

**Before (with duplicates):**
```
Q1: Are you a customer?
  ├─ Yes
  │  ├─ Q2: How long?
  │  ├─ Q3: Email Address    ← Asking once
  │  └─ Q4: Satisfaction
  │
  └─ No
     ├─ Q5: Are you interested?
     ├─ Q6: Email Address    ← Asking again! DUPLICATE!
     └─ Q7: Why not?
```

**After (optimized):**
```
Q1: Are you a customer?
├─ Q3: Email Address         ← Ask ONCE upfront
│
├─ Yes
│  ├─ Q2: How long?
│  └─ Q4: Satisfaction
│
└─ No
   ├─ Q5: Are you interested?
   └─ Q7: Why not?
```

**Benefits:**
- ✅ Shorter survey
- ✅ No redundancy
- ✅ Better user experience
- ✅ Clearer data

### Pattern: Common Duplicate Scenarios

**Scenario 1: Required Contact Info**
```
❌ Bad: Ask email separately in 5 different paths
✅ Good: Ask email ONCE after Q1 (all paths)
```

**Scenario 2: Demographic Questions**
```
❌ Bad: Ask "Age" in branch A and "Age Range" in branch B
✅ Good: Ask "Age" ONCE at the beginning (all paths)
```

**Scenario 3: Satisfaction Questions**
```
❌ Bad: Different "Rating" questions for different customer types
✅ Good: Ask ONE rating question at the end (all paths)
```

### Pro Tips for Avoiding Duplicates

1. **Audit Early**
   - Before adding logic, review your question list
   - Identify questions that might be asked multiple times
   
2. **Use "Common Questions" Section**
   - Put essential questions (email, name, demographics) at the start
   - Ask path-specific questions only in relevant branches

3. **Name Questions Clearly**
   - "Email Address" not "Q3" or "Contact"
   - Easier to spot when they're duplicated

4. **Trace Every Path**
   - Use the path selector to go through each journey
   - Note any repeated questions
   - Decide immediately: consolidate or keep?

5. **Ask: "Can this question move earlier?"**
   - If it appears in 80% of paths, move it before the branch
   - Reduces complexity and redundancy

---

## Tips for Better Surveys

### ✅ Do's

1. **Be Specific with Logic**
   - Instead of: "If they have a job"
   - Better: "If they selected 'Employed Full-Time' or 'Employed Part-Time'"

2. **Test All Paths**
   - Mentally go through each path
   - Make sure nothing is duplicated
   - Ensure no one gets stuck

3. **Use Clear Question Names**
   - "Employment Status" is better than "Q2b"
   - Helps you remember what each question is for

4. **Start Simple**
   - Begin with basic IF/THEN rules
   - Add complexity gradually
   - Test after each change

### ❌ Don'ts

1. **Don't Create Circular Logic**
   - ❌ Q2 shows if Q3 answered "Yes", and Q3 shows if Q2 answered "Yes"
   - This creates an impossible situation

2. **Don't Make Logic Too Complex**
   - ❌ Q4 shows if (Q1="Yes" AND Q2≠"No") OR (Q3>50 AND Q2 IN ["A","B"])
   - Break it into multiple simpler rules

3. **Don't Forget Alternative Paths**
   - ❌ Only logic for "Yes" answers, forgetting "No"
   - Always consider all possible responses

---

## Common Scenarios

### Scenario 1: Customer vs. Non-Customer Surveys
```
Q1: Are you our customer?
  ├─ Yes → Show Q2 (Product feedback)
  │        Show Q3 (Rating)
  │        Show Q4 (Suggestions)
  └─ No  → Show Q5 (Interest in becoming customer)
           Show Q6 (Why not)
```

### Scenario 2: Conditional Follow-ups
```
Q1: Do you exercise?
  ├─ Yes → Show Q2 (How often?)
  │        If Q2="Daily" → Show Q3 (Type of exercise)
  │        If Q2="Weekly" → Show Q4 (Any injuries?)
  └─ No  → Show Q5 (Interested in starting?)
```

### Scenario 3: Branching Survey by Demographics
```
Q1: What is your age group?
  ├─ Under 18 → Show teen-specific questions
  ├─ 18-65 → Show adult-specific questions
  └─ 65+ → Show senior-specific questions
```

### Scenario 4: Early Exit
```
Q1: Have you purchased in the last 6 months?
  ├─ No → Show Q2 (When was your last purchase?)
  │       If "5+ years ago" → [End Survey]
  └─ Yes → Continue with satisfaction questions
```

---

## Troubleshooting

### Problem: A Question Never Appears in Any Path
**Cause:** Logic is too restrictive
**Solution:** 
1. Check the condition for that question
2. Make sure at least one possible answer makes it appear
3. Look at parent questions - they might not show either

### Problem: Same Question Appears Multiple Times in a Path
**Cause:** Multiple rules lead to the same question
**Solution:**
1. Review all the show/hide rules
2. Consolidate similar conditions
3. Use "OR" instead of multiple rules

### Problem: Path Looks Confusing
**Cause:** Too many branches
**Solution:**
1. Group related questions into sections
2. Use clearer question names
3. Add comments explaining the logic

---

## Best Practices

1. **Document Your Logic**
   - Add notes about why certain questions show
   - Help others understand your survey design

2. **Test Before Deploying**
   - Go through each path manually
   - Ask: "Does this make sense?"
   - Check for typos in conditions

3. **Keep It Simple**
   - Don't nest conditions too deeply
   - Use clear, descriptive question text
   - Avoid double negatives ("If NOT not interested")

4. **Plan Ahead**
   - Sketch out your survey flow on paper first
   - Identify all the different respondent types
   - Plan their unique paths

5. **Get Feedback**
   - Show your logic map to others
   - Ask if paths make sense
   - Get users to test survey

---

## Summary

Survey Mapper helps you:
1. **Visualize** complex survey logic as a map
2. **Define** when questions should appear
3. **Test** all possible paths through your survey
4. **Ensure** every respondent gets the right questions

Use the **Editor View** to build your rules, and use the **Logic Map View** to see all the different survey paths and make sure everything works correctly.

Happy surveying! 🎯


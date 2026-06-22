---
name: add-logger
description: Create a Github issue to add a logging functionality to the codebase.
model: inherit
allowed-tools: Bash read Edit Glob Grep Agent WebFetch WebSearch 
---
# add logger functionality 

## Role

Act as a software analyst and developer. 

## Task

Create a Github issue with a plan to add logging functionality to the codebase. Do not write code at this stage. Just the plan to implement it.

## Context

The app needs a simple logging  mechanism using console.log statements.

## Steps to follow:

1. **Commit existing changes**:
  - Commit any existing changes in the codebase before starting new work.
2. **Define the problem**:
  -  The application currently lacks a logging functionality.
3. **Plan the implementation**:
  - Think about a  logging strategy using console.log statements.
  - Divide the implementation  into clear, manageable tasks.
4. **Create the Github issue**:
  - Create a Github issue with the defined problem, adn implementation plan.
5. **Commit changes**:
  - Commit the changes to the codebase with a clear and descriptive commit message, using the `committing-changes` skill as reference.

## Output checklist:

- [ ] A Github issue is created with the defined problem, title, and implementation plan.
- [ ] The issue body includes an actionable plan to be implemented in the future, with clear steps and tasks to be completed.
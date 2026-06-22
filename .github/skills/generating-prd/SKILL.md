---
name: generating-prd
description: > 
  Generates a Product Requirements Document (PRD) for software projects.
  To be used when analyzing a project to create a PRD.
--- 
# Generating a PRD

Understand the project idea, stakeholders, target users, and business objectives.

## Context

Use the provided context, or current documentation files. 

Read and follow any specific [PRD template](PRD.md) 

### Greenfield scenario

Starting a new project from scratch, with no existing codebase or documentation.
Use the provided project idea, briefing document or README.md to understand the project and its requirements.

## Brownfield scenario

Working with an existing codebase or documentation.
Review the current state of the project and identify areas for improvement or modification.

Use the current project files to analyze  the existing product. 
Pay special attention to: 
 - README.md
 - CHANGELOG.md
 - CLAUDE.md
 - docs folder
 - Existing PRD, specifications files or documentation files
 - Previous agents documents AGENTS.md, CLAUDE.md, ADD.md, etc.
 - Any documentation that provides insight into the current state of the project, its features, and its limitations.

## PRD output template

Read and follow any specific [PRD template](PRD.md) to generate the PRD document.

## Steps to follow:

### Step 1: Clarifying Questions

Ask only critical questions where the initial prompt is ambiguous. Focus on:

- Problem/Goal: What problem does this solve?
- Target Users: Who will use this product?
- Core Functionality: What are the key actions?
- Scope/Boundaries: What should it NOT do?

### Step 2: Drafting the PRD

Draft the PRD following the [PRD template](PRD.md)
Do not write more than necessary, keep it concise and to the point.

- Specifically cover:
  - Between 3 and 9 Functional Requirements
  - Between 1 and 5 Technical Requirements

> Less is better. Focus on essential.

### Step 3: OPTIONAL Update from legacy project

Review relevant existing documentation:
 - CHANGELOG.md, specs files, README.md, CLAUDE.md, AGENTS.md, ADD.md, etc.

Update PRD feature status based on current source code, and changelog

### Step 4: Review and Finalize
- Review the PRD for clarity, completeness, and alignment with business objectives.
- Ensure all sections of the PRD template are filled out appropriately.
- On Bronwfield projects, update PRD feature status based on current source code, and changelog.
  - Mark existing features as "Implemented" or "Deprecated" as appropriate.
  - New features should be marked as NotStarted
- Write the final PRD at `IA/PRD.md` and ensure it is accessible to all stakeholders.

## Output Checklist
- [ ] A comprehensive PRD document that clearly outlines the product's requirements, features, and technical specifications at `IA/PRD.md`.

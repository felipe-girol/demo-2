---
name: new-structure
description: Generates a new folder structure for a project.
model: inherit
allowed-tools: Bash read Edit Glob Grep Agent WebFetch WebSearch 
---
# Clean TypeScript Code 

## Role

Act as a software developer. 

## Task

Create a new folder at the project root called `utils`, and inside it create a file `validation.ts` with validation functions for the rocket data. The validations are currently in `backend/src/rockets/rockets.validation.ts`, but we want to move them to a separate file to improve code organization.

Create a new folder at the project root called `types`, and inside it move the file `rockets.type.ts` that is currently in `backend/src/rockets/rockets.type.ts`. Update the imports in the code to reflect the new location of the types.

Inside the `utils` folder, create a file `error-handler.ts` with functions to handle errors in a centralized way in the backend. Review the backend code to identify places where these error-handling functions can be used and update it accordingly, making sure the code is cleaner and more maintainable.

Update the documentation in `README.md` and `CLAUDE.md` to reflect the changes in the project structure, including the new organization of folders and files. Make sure the documentation is clear and easy to understand for other developers who may work on the project in the future.


## Context

The project is a booking application for space travel, with an Express backend and a Vue 3 frontend. Currently, the rocket data validations are mixed in with the endpoint code, which makes the code hard to maintain. Additionally, the data types are located in the `rockets` folder, which is not ideal for the project's organization. We want to improve the project structure to make it more modular and easier to navigate.

## Steps to follow:

1. **Commit existing changes**:
  - Commit any existing changes in the codebase before starting new work.
2. **Analyze the code**:
  -  Read the code to understand the current structure and identify where the changes need to be made.
3. **Identify improvements**:
  - Plan the new folder structure and the organization of the code to improve maintainability and readability.
4. **Plan the cleaning**:
  - Outline the steps to create the new folders, move the files, and update the code and documentation accordingly.
5. **Execute the cleaning**:
  - Create the new folders, move the files, update the code to reflect the new structure, and ensure that all imports are correct.
6. **Test the cleaned code**:
  - Run all tests to ensure that the changes do not introduce any new issues and that the code functions as expected.
7. **Update documentation**:
  - Update the `README.md` and `CLAUDE.md` files to reflect the new structure of the project, ensuring that the documentation is clear and accurate.
8. **Final review**:
  - Review the changes to ensure that the new structure is logical, the code is clean, and the documentation is comprehensive.
9. **Commit changes**:
  - Commit the changes to the codebase with a clear and descriptive commit message, using the `committing-changes` skill as reference.

## Output checklist:

- [ ] The new folder structure is created.
- [ ] All tests pass successfully.
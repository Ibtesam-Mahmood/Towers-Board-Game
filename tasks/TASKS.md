# Tasks Index & Execution Process

This file contains an index of tasks to be implemented on this project along with a detailed execution process for tracking progress and maintaining requirements alignment.

## Task Execution Process

### Progress Indicators

- `[ ]` - Not Started: Task has not been initiated
- `[~]` - In Progress: Task is currently being worked on
- `[X]` - Completed: Task has been fully implemented and tested

### Task Structure

Each task follows this format:

```
[Status] TaskID - Task Title
  Description: Brief description of what needs to be done
  Files Affected: List of files that will be modified
  Subtasks:
    [ ] Subtask 1
    [ ] Subtask 2
    [ ] Subtask 3
  Requirements Impact: New/Modified requirements (if any)
  Completion Notes: Final notes when task is completed
```

### Requirement Updates

When a task introduces new functionality not covered in REQUIREMENTS.md:

1. Mark the requirement impact in the task
2. Update REQUIREMENTS.md with new requirement numbers
3. Reference the requirement number in completion notes

---

## Task Completion Workflow

### When Starting a Task:

1. Change status from `[ ]` to `[~]`
2. Update the task with current date in completion notes
3. Begin working through subtasks, updating their status as you progress

### When Completing a Task:

1. Change status from `[~]` to `[X]`
2. Mark all subtasks as `[X]`
3. Fill in completion notes with:
   - Completion date
   - Summary of changes made
   - Any new requirements added to REQUIREMENTS.md
   - Testing notes or validation performed

### When Adding New Requirements:

1. Update REQUIREMENTS.md with new numbered requirements
2. Reference the new requirement numbers in the task's "Requirements Impact" section
3. Ensure the requirement is properly categorized in REQUIREMENTS.md

---

## Notes

- All tasks should be tested thoroughly before marking as complete
- UI/UX changes should be validated with the existing design system
- Performance impact should be considered for all new features
- Accessibility should be maintained or improved with all changes

---

## Features

- [ ] F1 - Improve menu UX
- [ ] F2 - Improve rule page UX, making it more interactive
- [ ] F3 - Advanced hover pop up system that displays all details about the entity being hovered on
- [ ] F4 - Expand hover system to units and statuses
- [X] F5 - Auto-display movement/attack range on unit selection

---

## Bugs

- [x] B1 - Combat menu buttons are overflowing outside the menu
- [ ] B2 - Dice should auto roll when you confirm combat
- [ ] B3 - Combat dice should appear in a small overlay in the corner and should not be obstructive
- [ ] B4 - Hide button in top right menu should be consistent with other menus
- [ ] B5 - Settings icon should be visible in top right menu
- [ ] B6 - Auto-start deploy action when tapping unit in army tab during deployment
- [ ] B7 - Remove show range button from the actions menu
- [ ] B8 - Game not ending when one army has no units left
- [X] B9 - Units are unable to attack

# Requirements Document: KrokBook

## Introduction

KrokBook is a web-based medical exam preparation application that provides a split-screen interface combining an interactive test-taking environment with an integrated note-taking system. The application enables medical students to practice exam questions, track their errors, and maintain organized study notes, all within a unified interface.

## Glossary

- **System**: The KrokBook web application
- **Subject_Folder**: A collection of questions organized by medical subject area
- **Tester**: The left panel component that displays questions and handles user interactions
- **Notebook**: The right panel component that provides note-taking and error tracking functionality
- **Study_Mode**: An interactive testing mode where answers are hidden until the user selects an option
- **Review_Mode**: A non-interactive mode where correct answers are immediately visible
- **Error_Record**: A database entry linking a user's incorrect answer to a specific question
- **Mock_Exam**: A randomized test consisting of 200 questions from all subjects
- **Error_Hub**: A dashboard displaying all user errors categorized by subject
- **Database_Parser**: The component that processes raw text question data into structured format

## Requirements

### Requirement 1: Subject Folder Management

**User Story:** As a medical student, I want to organize questions by subject, so that I can focus my study sessions on specific topics.

#### Acceptance Criteria

1. WHEN the application loads, THE System SHALL fetch and display all Subject_Folders from the database
2. WHEN a user selects a Subject_Folder, THE System SHALL load all associated questions into the Tester
3. WHEN a user selects a Subject_Folder, THE System SHALL load the associated notebook content into the Notebook
4. THE System SHALL maintain the selected Subject_Folder state throughout the user session

### Requirement 2: Question Database Upload

**User Story:** As a medical student, I want to upload question databases in text format or from files, so that I can quickly add new study material.

#### Acceptance Criteria

1. WHEN a user clicks the "Upload Database" button, THE System SHALL display a modal with both text input and file upload options
2. WHEN a user pastes raw text into the upload modal, THE Database_Parser SHALL parse the text into structured question objects
3. WHEN a user selects one or more .txt files, THE System SHALL read the file contents and parse them into structured question objects
4. WHEN a user selects one or more .docx files, THE System SHALL extract the text content and parse them into structured question objects
5. WHEN multiple files are uploaded, THE System SHALL parse all files and combine the results into a single preview
6. WHEN parsing is complete, THE System SHALL display a preview of parsed questions with validation status
7. WHEN a user confirms the upload, THE System SHALL save all valid questions to the selected Subject_Folder
8. IF parsing fails for any question, THEN THE System SHALL display specific error messages and allow the user to correct the input
9. THE System SHALL allow users to create a new Subject_Folder during the upload process
10. THE System SHALL allow users to select an existing Subject_Folder as the upload destination

### Requirement 3: Interactive Testing (Study Mode)

**User Story:** As a medical student, I want to answer questions without seeing the correct answer first, so that I can test my knowledge authentically.

#### Acceptance Criteria

1. WHEN Study_Mode is active, THE Tester SHALL display questions with answer options but hide the correct answer
2. WHEN a user selects an answer option, THE Tester SHALL reveal whether the selection is correct or incorrect
3. WHEN a user selects an incorrect answer, THE System SHALL automatically create an Error_Record in the database
4. WHEN an Error_Record is created, THE System SHALL automatically append the question to the "Error Work" tab in the Notebook
5. WHEN a user selects a correct answer, THE System SHALL provide visual feedback indicating success
6. THE Tester SHALL allow users to navigate to the next question after answering

### Requirement 4: Review Mode

**User Story:** As a medical student, I want to review questions with answers visible, so that I can study correct answers without testing myself.

#### Acceptance Criteria

1. WHEN Review_Mode is active, THE Tester SHALL display questions with the correct answer clearly marked
2. WHEN Review_Mode is active, THE Tester SHALL not record user selections as Error_Records
3. THE System SHALL allow users to toggle between Study_Mode and Review_Mode at any time
4. WHEN switching modes, THE Tester SHALL maintain the current question position

### Requirement 5: Question Search

**User Story:** As a medical student, I want to search for specific questions, so that I can quickly find topics I need to review.

#### Acceptance Criteria

1. WHEN a user types in the search bar, THE System SHALL filter questions based on question text and answer options
2. WHEN search results are displayed, THE Tester SHALL show only matching questions
3. WHEN a user clears the search, THE System SHALL restore the full question list
4. THE System SHALL update search results in real-time as the user types

### Requirement 6: Integrated Note-Taking

**User Story:** As a medical student, I want to take notes while studying questions, so that I can document my understanding and create study materials.

#### Acceptance Criteria

1. WHEN a Subject_Folder is selected, THE Notebook SHALL display a "Notes" tab with a rich text editor
2. THE Notebook SHALL use the Tiptap editor component for text formatting
3. WHEN a user edits notes, THE System SHALL save changes to the database
4. WHEN a user switches Subject_Folders, THE System SHALL load the corresponding notes for the new folder
5. THE Notebook SHALL support basic formatting including bold, italic, lists, and headings

### Requirement 7: Error Tracking and Review

**User Story:** As a medical student, I want to track questions I answered incorrectly, so that I can focus my review on weak areas.

#### Acceptance Criteria

1. WHEN a user answers a question incorrectly in Study_Mode, THE System SHALL create an Error_Record linking the user to the question
2. WHEN an Error_Record is created, THE System SHALL append the question to the "Error Work" tab in the Notebook
3. THE "Error Work" tab SHALL display all questions the user has answered incorrectly for the current Subject_Folder
4. THE System SHALL allow users to add explanations or notes to each error entry
5. WHEN a user adds an explanation to an error, THE System SHALL save it to the database

### Requirement 8: Error Hub Dashboard

**User Story:** As a medical student, I want to see all my errors organized by subject, so that I can identify patterns in my weak areas.

#### Acceptance Criteria

1. WHEN a user clicks the "Error Hub" link, THE System SHALL display a dashboard showing all Error_Records
2. THE Error_Hub SHALL group errors by Subject_Folder
3. THE Error_Hub SHALL display the count of errors for each subject
4. WHEN a user clicks on a subject in the Error_Hub, THE System SHALL navigate to that Subject_Folder with the "Error Work" tab active
5. THE Error_Hub SHALL display the most recent errors first within each subject group

### Requirement 9: Mock Exam Mode

**User Story:** As a medical student, I want to take a full-length practice exam with 200 random questions, so that I can simulate the actual exam experience.

#### Acceptance Criteria

1. WHEN a user clicks the "Mock Exam" button, THE System SHALL generate a test with 200 randomly selected questions from all Subject_Folders
2. WHEN Mock_Exam is active, THE System SHALL display questions in Study_Mode format
3. WHEN Mock_Exam is active, THE System SHALL track user answers and create Error_Records for incorrect answers
4. THE System SHALL display progress (e.g., "Question 45 of 200") during the Mock_Exam
5. WHEN a user completes all 200 questions, THE System SHALL display a summary showing total correct, incorrect, and percentage score
6. THE System SHALL allow users to exit Mock_Exam mode and return to normal subject-based study

### Requirement 10: User Interface Design

**User Story:** As a medical student, I want a clean, distraction-free interface, so that I can focus on studying without visual clutter.

#### Acceptance Criteria

1. THE System SHALL use a light mode color scheme with the Zinc theme from Tailwind CSS
2. THE System SHALL use white backgrounds with Zinc-200 borders for component separation
3. THE System SHALL use Lucide React icons for all iconography
4. THE System SHALL use Shadcn UI components for consistent design patterns
5. THE System SHALL maintain a split-screen layout with the Tester on the left and Notebook on the right
6. THE System SHALL use readable typography optimized for extended reading sessions

### Requirement 11: Data Persistence

**User Story:** As a medical student, I want my progress and notes saved automatically, so that I never lose my work.

#### Acceptance Criteria

1. WHEN a user creates or modifies notes, THE System SHALL persist changes to Supabase within 2 seconds
2. WHEN an Error_Record is created, THE System SHALL persist it to Supabase immediately
3. WHEN questions are uploaded, THE System SHALL persist them to Supabase before confirming success
4. IF a database operation fails, THEN THE System SHALL display an error message and allow the user to retry
5. THE System SHALL maintain data consistency between the client and database at all times

### Requirement 12: Question Data Model

**User Story:** As a developer, I want a clear data structure for questions, so that the system can reliably parse and display them.

#### Acceptance Criteria

1. THE System SHALL store questions with the following fields: question text, answer options, correct answer index, and subject folder reference
2. THE Database_Parser SHALL validate that each question has at least 2 answer options
3. THE Database_Parser SHALL validate that each question has exactly one correct answer
4. THE System SHALL support multiple answer options per question (minimum 2, maximum 10)
5. WHEN storing questions, THE System SHALL maintain the original order of answer options

### Requirement 13: Multi-Language Support

**User Story:** As a Ukrainian medical student, I want to use questions in Ukrainian, so that I can study in my native language.

#### Acceptance Criteria

1. THE Database_Parser SHALL correctly parse questions written in Ukrainian (Cyrillic script)
2. THE Database_Parser SHALL correctly parse answer options written in Ukrainian (Cyrillic script)
3. THE System SHALL support Ukrainian answer option labels (А, Б, В, Г, Д instead of A, B, C, D, E)
4. THE System SHALL display Ukrainian text correctly in all UI components
5. THE Database_Parser SHALL handle mixed English and Ukrainian content in the same database

### Requirement 14: Flexible Answer Format Detection

**User Story:** As a medical student, I want to upload questions in various formats, so that I can use questions from different sources without reformatting.

#### Acceptance Criteria

1. WHEN a question uses the format "Correct: A", THE Database_Parser SHALL detect the correct answer
2. WHEN a question marks the correct answer with an asterisk before the text (e.g., "А) *Азелаїн"), THE Database_Parser SHALL detect the correct answer
3. WHEN a question marks the correct answer with an asterisk after the text (e.g., "А) Азелаїн*"), THE Database_Parser SHALL detect the correct answer
4. WHEN a question uses the format "ANSWER: A" at the end, THE Database_Parser SHALL detect the correct answer (case-insensitive)
5. WHEN a question uses the Ukrainian format "ВІДПОВІДЬ: А" at the end, THE Database_Parser SHALL detect the correct answer (case-insensitive)
6. THE Database_Parser SHALL handle variations in spacing and formatting around asterisks and keywords
7. IF multiple answer format indicators are present, THEN THE Database_Parser SHALL use the first valid indicator found
8. IF no valid answer format is detected, THEN THE Database_Parser SHALL mark the question as invalid with a descriptive error message

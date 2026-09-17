-- ====================================================================
-- Proefficient Institute of Learning - Complete Database Schema & Seed Data
-- Fully synced with Prisma Schema & App Architecture
-- Compatible with XAMPP / MySQL / MariaDB / phpMyAdmin
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `lecture`;
DROP TABLE IF EXISTS `fee_payment`;
DROP TABLE IF EXISTS `fee`;
DROP TABLE IF EXISTS `mark`;
DROP TABLE IF EXISTS `test`;
DROP TABLE IF EXISTS `remark`;
DROP TABLE IF EXISTS `note`;
DROP TABLE IF EXISTS `parent_student`;
DROP TABLE IF EXISTS `timetable_entry`;
DROP TABLE IF EXISTS `class_subject`;
DROP TABLE IF EXISTS `student_profile`;
DROP TABLE IF EXISTS `section`;
DROP TABLE IF EXISTS `teacher_profile`;
DROP TABLE IF EXISTS `class`;
DROP TABLE IF EXISTS `subject`;
DROP TABLE IF EXISTS `notification`;
DROP TABLE IF EXISTS `refresh_token`;
DROP TABLE IF EXISTS `fcm_token`;
DROP TABLE IF EXISTS `notice`;
DROP TABLE IF EXISTS `room`;
DROP TABLE IF EXISTS `academic_config`;
DROP TABLE IF EXISTS `user`;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── 1. CORE USER TABLE ──────────────────────────────────────────────
CREATE TABLE `user` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL UNIQUE,
  `mobile` VARCHAR(191) NULL UNIQUE,
  `password` VARCHAR(191) NOT NULL,
  `role` ENUM('admin', 'teacher', 'student', 'parent', 'staff') NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `avatar` LONGTEXT NULL,
  `isMainAdmin` BOOLEAN NOT NULL DEFAULT FALSE,
  `permissions` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. CLASS TABLE ──────────────────────────────────────────────────
CREATE TABLE `class` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `standard` INT NOT NULL DEFAULT 10,
  `feeAmount` DOUBLE NULL DEFAULT 0,
  `timetableDocument` LONGTEXT NULL,
  `timetableDocumentName` VARCHAR(191) NULL,
  `timetableDocumentType` VARCHAR(191) NULL,
  `timetableUpdatedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. TEACHER PROFILE TABLE ────────────────────────────────────────
CREATE TABLE `teacher_profile` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL UNIQUE,
  `employeeId` VARCHAR(191) NOT NULL UNIQUE,
  `qualification` VARCHAR(191) NULL,
  `subjectExpertise` TEXT NULL,
  `joiningDate` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_teacher_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. SECTION TABLE ────────────────────────────────────────────────
CREATE TABLE `section` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `classTeacherId` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `section_classId_name_key` (`classId`, `name`),
  CONSTRAINT `fk_section_class` FOREIGN KEY (`classId`) REFERENCES `class` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_section_teacher` FOREIGN KEY (`classTeacherId`) REFERENCES `teacher_profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. STUDENT PROFILE TABLE ────────────────────────────────────────
CREATE TABLE `student_profile` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL UNIQUE,
  `rollNumber` VARCHAR(191) NOT NULL UNIQUE,
  `classId` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  `gender` VARCHAR(191) NULL,
  `dob` DATETIME(3) NULL,
  `address` TEXT NULL,
  `admissionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_student_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_class` FOREIGN KEY (`classId`) REFERENCES `class` (`id`),
  CONSTRAINT `fk_student_section` FOREIGN KEY (`sectionId`) REFERENCES `section` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. PARENT STUDENT LINK TABLE ────────────────────────────────────
CREATE TABLE `parent_student` (
  `id` VARCHAR(191) NOT NULL,
  `parentId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `relation` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parent_student_unique` (`parentId`, `studentId`),
  CONSTRAINT `fk_parent_link` FOREIGN KEY (`parentId`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_link` FOREIGN KEY (`studentId`) REFERENCES `student_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. SUBJECT TABLE ────────────────────────────────────────────────
CREATE TABLE `subject` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL UNIQUE,
  `code` VARCHAR(191) NULL UNIQUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. CLASS SUBJECT ASSOCIATION TABLE ──────────────────────────────
CREATE TABLE `class_subject` (
  `id` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_subject_unique` (`classId`, `subjectId`),
  CONSTRAINT `fk_cs_class` FOREIGN KEY (`classId`) REFERENCES `class` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cs_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cs_teacher` FOREIGN KEY (`teacherId`) REFERENCES `teacher_profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 9. TIMETABLE ENTRY TABLE ────────────────────────────────────────
CREATE TABLE `timetable_entry` (
  `id` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `dayOfWeek` INT NOT NULL,
  `startTime` VARCHAR(191) NOT NULL,
  `endTime` VARCHAR(191) NOT NULL,
  `room` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tt_section` FOREIGN KEY (`sectionId`) REFERENCES `section` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tt_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tt_teacher` FOREIGN KEY (`teacherId`) REFERENCES `teacher_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 10. LECTURE TABLE ───────────────────────────────────────────────
CREATE TABLE `lecture` (
  `id` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `startTime` DATETIME(3) NOT NULL,
  `endTime` DATETIME(3) NULL,
  `status` ENUM('ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ONGOING',
  `topic` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_lec_section` FOREIGN KEY (`sectionId`) REFERENCES `section` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lec_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lec_teacher` FOREIGN KEY (`teacherId`) REFERENCES `teacher_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 11. ATTENDANCE TABLE ────────────────────────────────────────────
CREATE TABLE `attendance` (
  `id` VARCHAR(191) NOT NULL,
  `lectureId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `status` ENUM('PRESENT', 'ABSENT', 'LATE') NOT NULL,
  `markedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_unique` (`lectureId`, `studentId`),
  CONSTRAINT `fk_att_lecture` FOREIGN KEY (`lectureId`) REFERENCES `lecture` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_student` FOREIGN KEY (`studentId`) REFERENCES `student_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 12. FEE TABLE ───────────────────────────────────────────────────
CREATE TABLE `fee` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `totalAmount` DOUBLE NOT NULL,
  `paidAmount` DOUBLE NOT NULL DEFAULT 0,
  `dueDate` DATETIME(3) NOT NULL,
  `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_fee_student` FOREIGN KEY (`studentId`) REFERENCES `student_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 13. FEE PAYMENT TABLE ───────────────────────────────────────────
CREATE TABLE `fee_payment` (
  `id` VARCHAR(191) NOT NULL,
  `feeId` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `mode` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NULL,
  `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_payment_fee` FOREIGN KEY (`feeId`) REFERENCES `fee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 14. TEST TABLE ──────────────────────────────────────────────────
CREATE TABLE `test` (
  `id` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NULL,
  `subjectId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `totalMarks` DOUBLE NOT NULL,
  `passingMarks` DOUBLE NULL DEFAULT 0,
  `testDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_test_class` FOREIGN KEY (`classId`) REFERENCES `class` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_test_section` FOREIGN KEY (`sectionId`) REFERENCES `section` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_test_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 15. MARK TABLE ──────────────────────────────────────────────────
CREATE TABLE `mark` (
  `id` VARCHAR(191) NOT NULL,
  `testId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `marks` DOUBLE NOT NULL,
  `rank` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mark_unique` (`testId`, `studentId`),
  CONSTRAINT `fk_mark_test` FOREIGN KEY (`testId`) REFERENCES `test` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mark_student` FOREIGN KEY (`studentId`) REFERENCES `student_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 16. REMARK TABLE ────────────────────────────────────────────────
CREATE TABLE `remark` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `type` ENUM('ACADEMIC', 'BEHAVIOURAL', 'APPRECIATION', 'IMPROVEMENT', 'GENERAL') NOT NULL,
  `content` TEXT NOT NULL,
  `isVisibleToParent` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_remark_student` FOREIGN KEY (`studentId`) REFERENCES `student_profile` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_remark_teacher` FOREIGN KEY (`teacherId`) REFERENCES `teacher_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 17. NOTE TABLE ──────────────────────────────────────────────────
CREATE TABLE `note` (
  `id` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `fileUrl` LONGTEXT NOT NULL,
  `fileType` VARCHAR(191) NOT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_note_section` FOREIGN KEY (`sectionId`) REFERENCES `section` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_note_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_note_teacher` FOREIGN KEY (`teacherId`) REFERENCES `teacher_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 18. NOTIFICATION TABLE ──────────────────────────────────────────
CREATE TABLE `notification` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 19. REFRESH TOKEN TABLE ─────────────────────────────────────────
CREATE TABLE `refresh_token` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `token` VARCHAR(500) NOT NULL UNIQUE,
  `expiresAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 20. FCM TOKEN TABLE ─────────────────────────────────────────────
CREATE TABLE `fcm_token` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `token` VARCHAR(500) NOT NULL UNIQUE,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_fcm_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 21. ROOM TABLE ──────────────────────────────────────────────────
CREATE TABLE `room` (
  `id` VARCHAR(191) NOT NULL,
  `number` VARCHAR(191) NOT NULL UNIQUE,
  `type` VARCHAR(191) NOT NULL,
  `capacity` INT NOT NULL DEFAULT 40,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 22. NOTICE TABLE ────────────────────────────────────────────────
CREATE TABLE `notice` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `senderId` VARCHAR(191) NOT NULL,
  `senderRole` VARCHAR(191) NOT NULL,
  `targetClassId` VARCHAR(191) NULL,
  `targetSectionId` VARCHAR(191) NULL,
  `imageUri` LONGTEXT NULL,
  `visibility` VARCHAR(191) NOT NULL DEFAULT 'all',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 23. ACADEMIC CONFIG TABLE ───────────────────────────────────────
CREATE TABLE `academic_config` (
  `id` VARCHAR(191) NOT NULL,
  `academicYear` VARCHAR(191) NULL,
  `startTime` VARCHAR(191) NOT NULL DEFAULT '08:00',
  `endTime` VARCHAR(191) NOT NULL DEFAULT '14:00',
  `periodDuration` INT NOT NULL DEFAULT 40,
  `periodsPerDay` INT NOT NULL DEFAULT 8,
  `daysPerWeek` INT NOT NULL DEFAULT 6,
  `breaks` TEXT NULL,
  `workingDays` TEXT NULL,
  `timetableActive` BOOLEAN NOT NULL DEFAULT FALSE,
  `schoolName` VARCHAR(191) NULL,
  `schoolAddress` VARCHAR(191) NULL,
  `schoolPhone` VARCHAR(191) NULL,
  `schoolEmail` VARCHAR(191) NULL,
  `schoolLogo` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── INITIAL SEED DATA ────────────────────────────────────────────────
-- Password Hashes:
-- admin123   => $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i
-- teacher123 => $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i
-- student123 => $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i
-- parent123  => $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i

INSERT INTO `academic_config` (`id`, `academicYear`, `startTime`, `endTime`, `periodDuration`, `periodsPerDay`, `daysPerWeek`, `timetableActive`, `schoolName`, `schoolPhone`, `schoolEmail`, `createdAt`, `updatedAt`) VALUES
('config-default-001', '2026-2027', '08:00', '19:00', 50, 6, 6, TRUE, 'Proefficient Institute of Learning', '+91 98765 43210', 'admin@proefficient.edu', NOW(3), NOW(3));

INSERT INTO `room` (`id`, `number`, `type`, `capacity`) VALUES
('room-101', '101', 'Classroom', 40),
('room-102', '102', 'Classroom', 40),
('room-lab1', 'Lab 1', 'Lab', 30);

-- Insert Administrators
INSERT INTO `user` (`id`, `name`, `email`, `mobile`, `password`, `role`, `status`, `isMainAdmin`, `permissions`, `createdAt`, `updatedAt`) VALUES
('usr-admin-001', 'Dr. V. T. Patel', 'admin@proefficient.edu', '9000000001', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'admin', 'ACTIVE', TRUE, '[]', NOW(3), NOW(3)),
('usr-admin-002', 'Hiren Joshi', 'hiren.subadmin@proefficient.edu', '9000000002', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'admin', 'ACTIVE', FALSE, '["masterData", "attendance", "timetable", "notices"]', NOW(3), NOW(3)),
('usr-admin-003', 'Pooja Trivedi', 'pooja.subadmin@proefficient.edu', '9000000003', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'admin', 'ACTIVE', FALSE, '["fees", "reports", "tests"]', NOW(3), NOW(3));

-- Insert Coaching Classes & Sections
INSERT INTO `class` (`id`, `name`, `standard`, `feeAmount`) VALUES
('cls-10', 'Class 10 - Foundation & Boards', 10, 35000),
('cls-11', 'Class 11 - JEE Advanced Target', 11, 55000),
('cls-12', 'Class 12 - NEET Medical Target', 12, 60000),
('cls-09', 'Class 9 - NTSE & Olympiad', 9, 30000);

INSERT INTO `section` (`id`, `name`, `classId`) VALUES
('sec-10a', 'Batch A', 'cls-10'),
('sec-11a', 'Batch A', 'cls-11'),
('sec-12a', 'Batch A', 'cls-12'),
('sec-09a', 'Batch A', 'cls-09');

-- Insert Subjects
INSERT INTO `subject` (`id`, `name`, `code`) VALUES
('sub-math', 'Mathematics', 'MATH-101'),
('sub-phys', 'Physics', 'PHY-101'),
('sub-chem', 'Chemistry', 'CHEM-101'),
('sub-bio', 'Biology', 'BIO-101'),
('sub-apti', 'Mental Ability & English', 'MAT-101');

-- Insert Faculty Users & Profiles
INSERT INTO `user` (`id`, `name`, `email`, `mobile`, `password`, `role`, `status`, `createdAt`, `updatedAt`) VALUES
('usr-t-001', 'Prof. Suresh Sharma', 'suresh.sharma@proefficient.edu', '9824000001', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'teacher', 'ACTIVE', NOW(3), NOW(3)),
('usr-t-002', 'Dr. Ananya Patel', 'ananya.patel@proefficient.edu', '9824000002', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'teacher', 'ACTIVE', NOW(3), NOW(3)),
('usr-t-003', 'Er. Vikram Verma', 'vikram.verma@proefficient.edu', '9824000003', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'teacher', 'ACTIVE', NOW(3), NOW(3)),
('usr-t-004', 'Dr. Rajesh Iyer', 'rajesh.iyer@proefficient.edu', '9824000004', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'teacher', 'ACTIVE', NOW(3), NOW(3));

INSERT INTO `teacher_profile` (`id`, `userId`, `employeeId`, `qualification`, `subjectExpertise`, `joiningDate`) VALUES
('tch-001', 'usr-t-001', 'FAC-MTH-01', 'M.Sc Mathematics, B.Ed (15+ Yrs Exp)', '["Mathematics","Calculus","Algebra"]', NOW(3)),
('tch-002', 'usr-t-002', 'FAC-PHY-02', 'Ph.D in Physics, IIT Bombay Alumnus', '["Physics","Mechanics","Optics"]', NOW(3)),
('tch-003', 'usr-t-003', 'FAC-CHM-03', 'M.Tech Chemical Engg, NIT Surat', '["Chemistry","Organic","Physical"]', NOW(3)),
('tch-004', 'usr-t-004', 'FAC-BIO-04', 'M.D. Anatomy, AIIMS Delhi Alumnus', '["Biology","Botany","Zoology"]', NOW(3));

-- Assign Subjects to Classes & Teachers
INSERT INTO `class_subject` (`id`, `classId`, `subjectId`, `teacherId`) VALUES
('cs-10-math', 'cls-10', 'sub-math', 'tch-001'),
('cs-10-phys', 'cls-10', 'sub-phys', 'tch-002'),
('cs-10-chem', 'cls-10', 'sub-chem', 'tch-003'),
('cs-10-bio', 'cls-10', 'sub-bio', 'tch-004'),
('cs-11-math', 'cls-11', 'sub-math', 'tch-001'),
('cs-11-phys', 'cls-11', 'sub-phys', 'tch-002'),
('cs-11-chem', 'cls-11', 'sub-chem', 'tch-003'),
('cs-12-phys', 'cls-12', 'sub-phys', 'tch-002'),
('cs-12-chem', 'cls-12', 'sub-chem', 'tch-003'),
('cs-12-bio', 'cls-12', 'sub-bio', 'tch-004');

-- Insert Students Users & Profiles
INSERT INTO `user` (`id`, `name`, `email`, `mobile`, `password`, `role`, `status`, `createdAt`, `updatedAt`) VALUES
('usr-s-001', 'Aarav Mehta', 'aarav.mehta@proefficient.edu', '9825000001', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'student', 'ACTIVE', NOW(3), NOW(3)),
('usr-s-002', 'Diya Shah', 'diya.shah@proefficient.edu', '9825000002', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'student', 'ACTIVE', NOW(3), NOW(3)),
('usr-s-003', 'Rohan Verma', 'rohan.verma@proefficient.edu', '9825000003', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'student', 'ACTIVE', NOW(3), NOW(3)),
('usr-s-004', 'Ananya Patel', 'ananya.student@proefficient.edu', '9825000004', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'student', 'ACTIVE', NOW(3), NOW(3)),
('usr-s-005', 'Kabir Joshi', 'kabir.joshi@proefficient.edu', '9825000005', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'student', 'ACTIVE', NOW(3), NOW(3));

INSERT INTO `student_profile` (`id`, `userId`, `rollNumber`, `classId`, `sectionId`, `gender`, `address`, `admissionDate`) VALUES
('stu-001', 'usr-s-001', '1001', 'cls-10', 'sec-10a', 'MALE', 'A-102 Swastik Society, Navrangpura, Ahmedabad', NOW(3)),
('stu-002', 'usr-s-002', '1002', 'cls-10', 'sec-10a', 'FEMALE', 'B-405 Satellite Towers, Satellite, Ahmedabad', NOW(3)),
('stu-003', 'usr-s-003', '1101', 'cls-11', 'sec-11a', 'MALE', 'C-12 Nilmani Apartments, Vastrapur, Ahmedabad', NOW(3)),
('stu-004', 'usr-s-004', '1201', 'cls-12', 'sec-12a', 'FEMALE', '7 Mansi Complex, Bodakdev, Ahmedabad', NOW(3)),
('stu-005', 'usr-s-005', '0901', 'cls-09', 'sec-09a', 'MALE', '15 Green Park, Science City Road, Ahmedabad', NOW(3));

-- Insert Parents Users & Link Students
INSERT INTO `user` (`id`, `name`, `email`, `mobile`, `password`, `role`, `status`, `createdAt`, `updatedAt`) VALUES
('usr-p-001', 'Rajesh Mehta', 'rajesh.mehta@gmail.com', '9712000001', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'parent', 'ACTIVE', NOW(3), NOW(3)),
('usr-p-002', 'Sanjay Verma', 'sanjay.verma@gmail.com', '9712000003', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5E61/2k.O.dJ015i74p329i', 'parent', 'ACTIVE', NOW(3), NOW(3));

INSERT INTO `parent_student` (`id`, `parentId`, `studentId`, `relation`) VALUES
('ps-001', 'usr-p-001', 'stu-001', 'FATHER'),
('ps-002', 'usr-p-002', 'stu-003', 'FATHER');

-- Insert Fee Installments
INSERT INTO `fee` (`id`, `studentId`, `title`, `totalAmount`, `paidAmount`, `dueDate`, `status`, `createdAt`) VALUES
('fee-001', 'stu-001', 'Class 10 First Term Tuition Fee', 17500, 17500, NOW(3), 'PAID', NOW(3)),
('fee-002', 'stu-001', 'Class 10 Second Term Tuition Fee', 17500, 5000, DATE_ADD(NOW(3), INTERVAL 30 DAY), 'PARTIAL', NOW(3)),
('fee-003', 'stu-003', 'JEE 11th Advanced First Installment', 27500, 27500, NOW(3), 'PAID', NOW(3)),
('fee-004', 'stu-003', 'JEE 11th Advanced Second Installment', 27500, 0, DATE_ADD(NOW(3), INTERVAL 15 DAY), 'PENDING', NOW(3));

INSERT INTO `fee_payment` (`id`, `feeId`, `amount`, `mode`, `reference`, `paidAt`) VALUES
('pay-001', 'fee-001', 17500, 'UPI', 'UPI/382910482910', NOW(3)),
('pay-002', 'fee-002', 5000, 'CASH', 'REC-CASH-8812', NOW(3)),
('pay-003', 'fee-003', 27500, 'ONLINE', 'PAY-ONLINE-9921', NOW(3));

-- Insert Tests & Student Marks
INSERT INTO `test` (`id`, `classId`, `sectionId`, `subjectId`, `title`, `totalMarks`, `passingMarks`, `testDate`, `createdAt`) VALUES
('test-101', 'cls-10', 'sec-10a', 'sub-math', 'Quadratic Equations & Polynomials Unit Test', 50, 18, NOW(3), NOW(3)),
('test-102', 'cls-10', 'sec-10a', 'sub-phys', 'Light Reflection & Refraction Test', 50, 18, NOW(3), NOW(3)),
('test-103', 'cls-11', 'sec-11a', 'sub-math', 'JEE Advanced Trigonometry & Complex Numbers', 100, 35, NOW(3), NOW(3));

INSERT INTO `mark` (`id`, `testId`, `studentId`, `marks`, `rank`) VALUES
('mrk-101-1', 'test-101', 'stu-001', 46, 1),
('mrk-101-2', 'test-101', 'stu-002', 42, 2),
('mrk-102-1', 'test-102', 'stu-001', 48, 1),
('mrk-102-2', 'test-102', 'stu-002', 39, 2),
('mrk-103-1', 'test-103', 'stu-003', 88, 1);

-- Insert Notices
INSERT INTO `notice` (`id`, `title`, `content`, `date`, `senderId`, `senderRole`, `visibility`) VALUES
('not-001', '📢 Welcome to Academic Session 2026-2027', 'Classes have commenced across all batches. Please adhere to the daily timetable and attendance policies.', NOW(3), 'usr-admin-001', 'admin', 'all'),
('not-002', '📝 Class 10 & 11 Periodic Unit Test Schedule Announced', 'Periodic tests for Class 10 and JEE 11th start next week. Revision notes have been uploaded.', NOW(3), 'usr-admin-001', 'admin', 'all'),
('not-003', '💳 Second Term Fee Installment Reminder', 'Parents are requested to clear second installment fee dues before the due date.', NOW(3), 'usr-admin-001', 'admin', 'parents');

-- Insert Timetable Entries
INSERT INTO `timetable_entry` (`id`, `sectionId`, `subjectId`, `teacherId`, `dayOfWeek`, `startTime`, `endTime`, `room`, `isActive`) VALUES
('tt-10a-mon-1', 'sec-10a', 'sub-math', 'tch-001', 1, '08:00', '08:50', '101', TRUE),
('tt-10a-mon-2', 'sec-10a', 'sub-phys', 'tch-002', 1, '09:00', '09:50', '101', TRUE),
('tt-10a-mon-3', 'sec-10a', 'sub-chem', 'tch-003', 1, '10:00', '10:50', '101', TRUE),
('tt-10a-tue-1', 'sec-10a', 'sub-bio', 'tch-004', 2, '08:00', '08:50', '101', TRUE),
('tt-10a-tue-2', 'sec-10a', 'sub-math', 'tch-001', 2, '09:00', '09:50', '101', TRUE),
('tt-11a-mon-1', 'sec-11a', 'sub-math', 'tch-001', 1, '09:00', '09:50', '102', TRUE),
('tt-11a-mon-2', 'sec-11a', 'sub-phys', 'tch-002', 1, '10:00', '10:50', '102', TRUE);

/*
SQLyog Community v12.4.0 (64 bit)
MySQL - 8.0.30 : Database - quizify
*********************************************************************
*/


/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`quizify` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `quizify`;

DROP TABLE IF EXISTS `question`;

CREATE TABLE `question` (
  `id` varchar(10) NOT NULL,
  `quiz_id` varchar(10) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `type` enum('multiple','boolean') NOT NULL,
  `difficulty` enum('easy','medium','hard') NOT NULL,
  `question_text` text NOT NULL,
  `correct_answer` text NOT NULL,
  `incorrect_answers` json NOT NULL,
  `is_generated` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `questionaccuracy`;

CREATE TABLE `questionaccuracy` (
  `id` varchar(10) NOT NULL,
  `question_id` varchar(10) NOT NULL,
  `quiz_id` varchar(10) DEFAULT NULL,
  `total_answered` int DEFAULT '0',
  `correct_answers` int DEFAULT '0',
  `incorrect_answers` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `questionimage`;

CREATE TABLE `questionimage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(10) NOT NULL,
  `question_id` varchar(10) NOT NULL,
  `image_url` text NOT NULL,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quiz`;

CREATE TABLE `quiz` (
  `id` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `status` enum("private", "public") DEFAULT "private",
  `category` varchar(100) DEFAULT NULL,
  `created_by` varchar(10) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quizsession`;

CREATE TABLE `quizsession` (
  `id` varchar(10) NOT NULL,
  `quiz_id` varchar(10) NOT NULL,
  `user_id` varchar(10) NOT NULL,
  `started_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  `score` int DEFAULT NULL,
  `status` enum('in_progress','completed','expired') DEFAULT 'in_progress',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `submissionanswer`;

CREATE TABLE `submissionanswer` (
  `id` varchar(10) NOT NULL,
  `quiz_session_id` varchar(10) NOT NULL,
  `question_id` varchar(10) NOT NULL,
  `selected_answer` text,
  `is_correct` tinyint(1) DEFAULT NULL,
  `answered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `subscription`;

CREATE TABLE `subscription` (
  `id_subs` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) DEFAULT 'Free',
  PRIMARY KEY (`id_subs`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

insert  into `subscription`(`id_subs`,`status`) values 
(1,'Free'),
(2,'Premium');

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `id` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('teacher','student') NOT NULL,
  `subscription_id` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `userlog`;

CREATE TABLE `userlog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(10) NOT NULL,
  `action_type` varchar(255) NOT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


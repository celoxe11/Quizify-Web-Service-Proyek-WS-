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

/*Table structure for table `question` */

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

/*Data for the table `question` */

insert  into `question`(`id`,`quiz_id`,`category`,`type`,`difficulty`,`question_text`,`correct_answer`,`incorrect_answers`,`is_generated`,`created_at`,`updated_at`) values 
('Q001','QU001','Geography','multiple','easy','Thymbra utroque depopulo molestiae adfero ad similique calamitas delibero ter.','alii','[\"vacuus\", \"textus\", \"perspiciatis\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q002','QU001','Geography','boolean','easy','Aestivus commodi corpus.','False','[\"True\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q003','QU001','Geography','multiple','medium','Acies cubo sed deleniti solvo urbanus laboriosam bellum decipio.','angustus','[\"anser\", \"agnosco\", \"clam\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q004','QU001','Geography','boolean','medium','Aequitas summopere aperio verus.','False','[\"True\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q005','QU001','Geography','boolean','hard','Alienus sui capitulus substantia territo synagoga molestias arguo.','True','[\"False\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q006','QU002','Math','multiple','hard','Vetus strenuus arcus aurum caelum cornu abduco assentator tabernus.','sopor','[\"arbustum\", \"ascisco\", \"comes\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q007','QU002','Math','boolean','hard','Harum omnis desolo certe auditor succedo cunabula decerno.','True','[\"False\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q008','QU002','Math','multiple','easy','Arceo spero cogito tardus sordeo occaecati.','nemo','[\"solvo\", \"adopto\", \"decerno\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q009','QU002','Math','multiple','easy','Baiulus talus demoror ara inflammatio vester.','benevolentia','[\"cado\", \"praesentium\", \"calculus\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q010','QU002','Math','multiple','hard','Timor voluntarius adhuc tui creator.','exercitationem','[\"triduana\", \"talis\", \"animadverto\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q011','QU002','Math','boolean','easy','Tero adsum quibusdam beneficium temporibus aro.','True','[\"False\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q012','QU002','Math','multiple','hard','Utique acquiro validus coniecto ultio ambitus.','vomer','[\"terreo\", \"curatio\", \"libero\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q013','QU003','Science','boolean','medium','Summopere viriliter decipio admitto reprehenderit suffoco cognatus cras.','False','[\"True\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q014','QU003','Science','multiple','medium','Sto suadeo cupiditas blanditiis curso demulceo aliquam minima praesentium.','cicuta','[\"ciminatio\", \"coaegresco\", \"comptus\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q015','QU003','Science','multiple','easy','Strenuus benigne vigilo stillicidium.','carmen','[\"advoco\", \"paulatim\", \"cinis\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q016','QU004','History','boolean','medium','Verecundia astrum vel velut antiquus corona arcus possimus clarus.','True','[\"False\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q017','QU004','History','multiple','medium','Templum dens soleo absconditus.','eius','[\"carmen\", \"adhuc\", \"reiciendis\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q018','QU004','History','multiple','hard','Ambitus valeo una termes tantum abeo depromo vesper apud.','aegrus','[\"velut\", \"antepono\", \"error\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q019','QU004','History','multiple','easy','Thymbra mollitia angustus.','carmen','[\"tabernus\", \"animi\", \"dolorum\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q020','QU005','Math','boolean','hard','Ulciscor dedico candidus comparo vacuus cometes contra cui depraedor vociferor.','True','[\"False\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q021','QU005','Math','multiple','medium','Truculenter textilis curo error verbera quos.','defluo','[\"tutis\", \"substantia\", \"vesica\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q022','QU005','Math','boolean','hard','Demo socius stips triduana ustilo cibus.','True','[\"False\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q023','QU005','Math','boolean','medium','Ad architecto arbustum titulus vigor cunae brevis campana comptus.','False','[\"True\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('Q024','QU005','Math','multiple','medium','Confugo umerus totidem.','degusto','[\"et\", \"colo\", \"avaritia\"]',1,'2025-06-06 15:02:32','2025-06-06 15:02:32');

/*Table structure for table `questionaccuracy` */

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

/*Data for the table `questionaccuracy` */

/*Table structure for table `questionimage` */

DROP TABLE IF EXISTS `questionimage`;

CREATE TABLE `questionimage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(10) NOT NULL,
  `question_id` varchar(10) NOT NULL,
  `image_url` text NOT NULL,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `questionimage` */

/*Table structure for table `quiz` */

DROP TABLE IF EXISTS `quiz`;

CREATE TABLE `quiz` (
  `id` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL,
  `created_by` varchar(10) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `quiz` */

insert  into `quiz`(`id`,`title`,`description`,`category`,`created_by`,`created_at`,`updated_at`) values 
('QU001','cohibeo auctus auditor','Accusantium celo conatus inventore tero cursus.','Geography','TE007','2025-06-06 15:02:32','2025-06-06 15:02:32'),
('QU002','inflammatio minus corroboro','Vulgus caritas tricesimus aer quam recusandae avaritia condico textor.','Math','TE008','2025-06-06 15:02:32','2025-06-06 15:02:32'),
('QU003','neque aegrotatio vetus','Vitiosus dolorum contego.','Science','TE006','2025-06-06 15:02:32','2025-06-06 15:02:32'),
('QU004','reiciendis tempore necessitatibus','Enim capio qui nam certe cunctatio sunt tantum.','History','TE004','2025-06-06 15:02:32','2025-06-06 15:02:32'),
('QU005','umerus neque reiciendis','Sonitus caute quia qui stabilis.','Math','TE006','2025-06-06 15:02:32','2025-06-06 15:02:32');

/*Table structure for table `quizsession` */

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

/*Data for the table `quizsession` */

/*Table structure for table `submissionanswer` */

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

/*Data for the table `submissionanswer` */

/*Table structure for table `subscription` */

DROP TABLE IF EXISTS `subscription`;

CREATE TABLE `subscription` (
  `id_subs` int NOT NULL AUTO_INCREMENT,
  `status` varchar(50) DEFAULT 'Free',
  PRIMARY KEY (`id_subs`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `subscription` */

insert  into `subscription`(`id_subs`,`status`) values 
(1,'Free'),
(2,'Premium');

/*Table structure for table `user` */

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

/*Data for the table `user` */

insert  into `user`(`id`,`name`,`username`,`email`,`password_hash`,`role`,`subscription_id`,`is_active`,`created_at`,`updated_at`) values 
('ST001','Catherine Bruen','kathlyn52','francesco82@hotmail.com','$2b$10$2hztx6rZh5djD4UgbIoZmufhLi/Y5GbVK2TtNMTa1IvFB0DcR86qy','student',1,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('ST002','Roger Konopelski','paolo64','omari22@hotmail.com','$2b$10$v9XL56AYLwfCR/1NdS/tHuV.QH9okbqS0n291BFdB3gLrVw9NkjvG','student',1,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('ST005','Heidi Parker','jennie.boehm','jacinto92@hotmail.com','$2b$10$F3HeV0gL/fNa9ZqDNGqj/.6IOkPHBdOGi0XI7a59n8VFTb4.ETknq','student',1,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('ST010','Alexander Pfannerstill','matilde_murphy40','jillian91@gmail.com','$2b$10$dT6KjbhNQyqIsR2E36s8rOhuCvNtNTrIyXtLh/e4f1ZC2H8r97Y4a','student',1,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('TE003','Wilbur Ledner','felipe_harris65','betty7@gmail.com','$2b$10$PhprS4/U8WusKxE24qW4VOCW8jb29VJSFG578CfIxEZ54U2a2Uhba','teacher',2,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('TE004','Lola Armstrong','krystal32','kiel59@yahoo.com','$2b$10$bcIRTVxwdGHE8Xw9.VXXQuHJgGBXgcezSTuKMhHf66pOjTumxsC1m','teacher',2,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('TE006','Andre Wolff-Botsford','jovani_donnelly82','marisol87@yahoo.com','$2b$10$KIK49CE//M7fA1ZYtsiqZeyz13xhq6PFlwMdwohpyXgzoxoAw3J8m','teacher',2,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('TE007','Mrs. Winifred Hayes','gladyce6','sarina50@yahoo.com','$2b$10$jvE5m/fN0cIwlPASIiyDp.a6B.0B08riM/zxzlsZbV2BS1WAAHR4S','teacher',2,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('TE008','Micheal Lockman','wilfredo.gusikowski','anderson.hermann@yahoo.com','$2b$10$T8/P3k8oC1v5/OKFEdjwfOvhJ0o3iSv4SmtEthdMkvt2SBhJIaWgK','teacher',2,1,'2025-06-06 15:02:32','2025-06-06 15:02:32'),
('TE009','Howard Champlin','jaden77','jedidiah.feest@yahoo.com','$2b$10$PGMg6K5Du7hbH6er5ilE6uETECXwgO1QDU3DtQzsVfaA.BBczd//C','teacher',2,1,'2025-06-06 15:02:32','2025-06-06 15:02:32');

/*Table structure for table `userlog` */

DROP TABLE IF EXISTS `userlog`;

CREATE TABLE `userlog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(10) NOT NULL,
  `action_type` varchar(255) NOT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `userlog` */

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

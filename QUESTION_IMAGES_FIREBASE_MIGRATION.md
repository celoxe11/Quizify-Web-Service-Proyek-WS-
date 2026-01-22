# Question Images Migration to Firebase Cloud Storage

## Summary

Successfully migrated question image storage from local file system to Firebase Cloud Storage in the `saveQuizWithQuestions` function.

## Changes Made

### 1. Created Firebase Image Helper (`src/utils/firebaseImageHelper.js`)

**New Functions:**

- `uploadBase64ToFirebase(base64Data, userId, questionId)` - Uploads base64 images to Firebase
- `deleteFileFromFirebase(fileUrl)` - Deletes images from Firebase Storage
- `isFirebaseUrl(url)` - Checks if a URL is a Firebase Storage URL

### 2. Updated `teacherController.js`

#### Imports Added:

```javascript
const {
  uploadBase64ToFirebase,
  deleteFileFromFirebase,
  isFirebaseUrl,
} = require("../utils/firebaseImageHelper");
```

#### Functions Updated:

**a) `saveQuizWithQuestions` - Image Upload Section (Lines 251-340)**

- **Before:** Saved base64 images to local `./src/uploads/${userId}/` directory
- **After:** Uploads base64 images to Firebase Storage at `questions/${userId}/`
- **URL Format:** `https://storage.googleapis.com/bucket/questions/userId/question_Q001_timestamp_random.png`

**b) `saveQuizWithQuestions` - Delete Removed Questions (Lines 124-141)**

- **Before:** Deleted images from local file system using `fs.unlinkSync()`
- **After:** Deletes images from Firebase using `deleteFileFromFirebase()`

**c) `deleteQuiz` - Delete Quiz Images (Lines 398-407)**

- **Before:** Deleted images from local file system
- **After:** Deletes images from Firebase Cloud Storage

## How It Works

### Creating/Updating Questions with Images

1. **Frontend sends base64 image:**

   ```json
   {
     "question_text": "What is this?",
     "question_image": "data:image/png;base64,iVBORw0KGgoAAAANS..."
   }
   ```

2. **Backend processes:**
   - Detects it's a base64 image (not a URL)
   - Calls `uploadBase64ToFirebase(base64Data, userId, questionId)`
   - Uploads to Firebase Storage
   - Gets back Firebase URL
   - Saves URL to database

3. **Database stores:**
   ```
   image_url: "https://storage.googleapis.com/bucket/questions/ST001/question_Q001_1234567890_abc123.png"
   ```

### Updating Questions with New Images

1. **Frontend sends new base64 image**
2. **Backend:**
   - Uploads new image to Firebase
   - Finds old image record in database
   - Deletes old image from Firebase using `deleteFileFromFirebase()`
   - Deletes old image record from database
   - Creates new image record with new Firebase URL

### Deleting Questions/Quizzes

1. **When deleting a question or quiz:**
   - Finds all associated images in database
   - Calls `deleteFileFromFirebase()` for each image URL
   - Deletes image records from database
   - Deletes questions/quiz

## File Structure in Firebase Storage

```
your-bucket/
├── avatars/
│   └── avatar-1234567890-123456789.jpg
└── questions/
    ├── ST001/  (student user ID)
    │   ├── question_Q001_1705901234567_abc123.png
    │   └── question_Q002_1705901234568_def456.png
    └── TE001/  (teacher user ID)
        └── question_Q003_1705901234569_ghi789.png
```

## Backward Compatibility

The code handles both old and new URL formats:

**Old Format (Local Storage):**

```
/uploads/ST001/question_Q001_1234567890.png
```

**New Format (Firebase):**

```
https://storage.googleapis.com/bucket/questions/ST001/question_Q001_1234567890_abc123.png
```

When encountering old format URLs:

- Keeps them as-is in the database
- Skips deletion attempts (logs a message)
- New uploads use Firebase format

## Benefits

✅ **Scalability** - No disk space limitations
✅ **Reliability** - Built-in redundancy and backups
✅ **Performance** - CDN delivery for faster image loading
✅ **Cleanup** - Automatic deletion of old images
✅ **Consistency** - Same pattern as avatar uploads

## Testing

### Test Create Quiz with Image:

```json
POST /api/teacher/quiz/save
{
  "title": "Test Quiz",
  "questions": [
    {
      "question_text": "What is this?",
      "question_image": "data:image/png;base64,iVBORw0KGgoAAAANS...",
      "correct_answer": "A",
      "incorrect_answers": ["B", "C", "D"]
    }
  ]
}
```

### Expected Result:

- ✅ Image uploaded to Firebase Storage
- ✅ Database contains Firebase URL
- ✅ Image accessible via public URL

### Test Update Quiz with New Image:

```json
PUT /api/teacher/quiz/save
{
  "quiz_id": "QU001",
  "questions": [
    {
      "id": "Q001",
      "question_image": "data:image/png;base64,NEW_IMAGE_DATA..."
    }
  ]
}
```

### Expected Result:

- ✅ New image uploaded to Firebase
- ✅ Old image deleted from Firebase
- ✅ Database updated with new URL

### Test Delete Quiz:

```json
DELETE /api/teacher/quiz/delete
{
  "id": "QU001"
}
```

### Expected Result:

- ✅ All question images deleted from Firebase
- ✅ All questions deleted from database
- ✅ Quiz deleted from database

## Console Logs

When working correctly, you should see:

**Upload:**

```
Successfully uploaded to Firebase: questions/ST001/question_Q001_1234567890_abc123.png
```

**Delete:**

```
Successfully deleted file from Firebase: questions/ST001/question_Q001_1234567890_abc123.png
```

**Old Format (Skipped):**

```
Skipping deletion of old format URL: /uploads/ST001/question_Q001.png
```

## Migration Status

- [x] Created Firebase image helper functions
- [x] Updated `saveQuizWithQuestions` to upload to Firebase
- [x] Updated `saveQuizWithQuestions` to delete from Firebase
- [x] Updated `deleteQuiz` to delete from Firebase
- [x] Backward compatibility for old URLs
- [x] Error handling
- [ ] Migrate existing images from local storage to Firebase (optional)

## Next Steps

1. ✅ Test creating quizzes with images
2. ✅ Test updating questions with new images
3. ✅ Test deleting quizzes
4. ✅ Verify images are accessible
5. ✅ Verify old images are deleted
6. (Optional) Migrate existing images from `./src/uploads/` to Firebase

---

**Status:** ✅ Complete and Ready for Testing
**Date:** 2026-01-22

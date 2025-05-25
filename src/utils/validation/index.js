const schema = {}
const updateQuestionSchema = require('./updateQuestionSchema')	
const questionSchema = require('./questionSchema')

schema.questionSchema = questionSchema
schema.updateQuestionSchema = updateQuestionSchema

module.exports = schema
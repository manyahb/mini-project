const express = require('express');
const cors = require('cors');
require('dotenv').config();

const axios = require('axios'); // We need axios to call the Google API

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Allows your React app to talk to this server
app.use(express.json()); // Allows server to understand JSON data

// === API ROUTES ===

/**
 * [POST] /api/generate-quiz
 * Receives a topic from the client, calls the Gemini API, and returns a JSON quiz.
 */
app.post('/api/generate-quiz', async (req, res) => {
  const { topic } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // Reads from your .env file
  
  
  // --- API Key Check ---
  // This check is crucial.
  if (!apiKey || apiKey === 'paste_your_long_api_key_here' || apiKey.includes('!!!')) {
    console.error('Error: GEMINI_API_KEY is not set in the .env file.');
    return res.status(500).json({ error: 'Server configuration error: API key is missing or not set. Please update backend/.env' });
  }

  // --- API Setup ---
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  console.log(`Received quiz request for topic: ${topic}`);

  // --- System Prompt (The Rules for the AI) ---
  const systemPrompt = `You are a helpful quiz generation assistant.
  Your task is to generate a 10-question multiple-choice quiz on a given topic.
  You must return the response as a valid JSON object only, with no other text, markdown, or " \`\`\`json " tags.
  
  The JSON object must have a single key "questions", which is an array of 10 question objects.
  Each question object must have the following keys:
  - "question": A string (the question text)
  - "options": An array of 4 strings (the options)
  - "correctIndex": A number (0-3) representing the index of the correct option
  - "explanation": A string (a brief explanation of the correct answer)`;

  // This is the user's specific request
  const userQuery = `Generate the 10-question quiz on the topic: "${topic}"`;

  try {
    // --- THIS IS THE LIVE API CALL ---
    const geminiResponse = await axios.post(apiUrl, 
      {
        // The user's query
        contents: [{ parts: [{ text: userQuery }] }],
        
        // The instructions for the AI's persona and output format
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        
        // This configuration tells the model to ONLY output JSON.
        generationConfig: {
          responseMimeType: "application/json",
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // --- Process the Response ---
    // The response from Gemini is a string of JSON.
    const jsonString = geminiResponse.data.candidates[0].content.parts[0].text;
    
    // We parse that string into a real JavaScript object.
    const quizJson = JSON.parse(jsonString);

    // Send the structured JSON (e.g., { questions: [...] }) to the React frontend
    console.log('Successfully generated quiz from API.');
    res.json(quizJson);

  } catch (error) {
    // This provides more detailed error logging in your backend terminal
    console.error('Error calling Gemini API:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Status:', error.response.status);
      
      // Check for API key issues specifically
      if (error.response.status === 400) {
         if (error.response.data.error.message.includes("API key not valid")) {
            return res.status(500).json({ error: 'Failed to generate quiz. Your API key is not valid.' });
         }
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error Message:', error.message);
    }
    res.status(500).json({ error: 'Failed to generate quiz. An error occurred on the server.' });
  }
});


/**
 * [POST] /api/evaluate-quiz
 * This route remains EXACTLY THE SAME. It receives the quiz data (which
 * now comes from the AI) and the user's answers, scores them, and returns feedback.
 */
app.post('/api/evaluate-quiz', (req, res) => {
  const { quizData, userAnswers } = req.body;

  if (!quizData || !userAnswers) {
    return res.status(400).json({ error: 'Missing quiz data or user answers.' });
  }

  let score = 0;
  const feedback = [];
  
  // We need to access the "questions" array *inside* the quizData object
  const questions = quizData.questions || quizData; 

  questions.forEach((question, index) => {
    // Handle cases where the AI might have made a mistake
    const correctIndex = question.correctIndex || 0;
    const userAnsIndex = userAnswers[index];
    
    const isCorrect = (correctIndex === userAnsIndex);
    if (isCorrect) {
      score++;
    }

    // Ensure options exist before trying to access them
    const options = question.options || [];

    feedback.push({
      question: question.question || "Question text missing",
      userAnswer: options[userAnsIndex] || "No answer provided",
      correctAnswer: options[correctIndex] || "Correct answer missing",
      isCorrect: isCorrect,
      explanation: question.explanation || "No explanation provided.",
    });
  });

  res.json({
    score: score,
    total: questions.length,
    feedback: feedback,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
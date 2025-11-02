import React, { useState } from 'react';
import axios from 'axios';
// Make sure you have created App.css in the same src/ folder
import './App.css'; 

// The base URL for our Node.js backend server
const API_BASE_URL = 'http://localhost:3001';

// The main component of our application
function App() {
  // State to manage the topic input by the user
  const [topic, setTopic] = useState('');
  
  // State to hold the quiz questions (an array) received from the backend
  const [quizData, setQuizData] = useState(null);
  
  // State to store the user's selected answers (an array of numbers)
  const [userAnswers, setUserAnswers] = useState(null);
  
  // State to hold the final score and feedback from the backend
  const [results, setResults] = useState(null);
  
  // State to manage loading indicators
  const [isLoading, setIsLoading] = useState(false);
  
  // State to hold any error messages
  const [error, setError] = useState('');

  /**
   * Handles the "Generate Quiz" button click.
   * Sends the topic to the backend to get quiz questions.
   */
  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setQuizData(null);
    setResults(null);
    
    try {
      // Make a POST request to our backend's generate-quiz endpoint
      const response = await axios.post(`${API_BASE_URL}/api/generate-quiz`, { topic });
      
      // Fix for data format: We expect an object { questions: [...] }
      // This line safely gets the array from inside the response object.
      const quizArray = response.data?.questions;

      if (quizArray && quizArray.length > 0) {
        setQuizData(quizArray); // Set the state with the actual array
        setUserAnswers(new Array(quizArray.length).fill(null)); // Initialize empty answers
      } else {
        // Handle case where data is empty or malformed
        setError('Failed to generate quiz. The data format was incorrect.');
      }
      
    } catch (err) {
      console.error('Error generating quiz:', err);
      // Display the specific error from the backend if available
      const serverError = err.response?.data?.error || 'An error occurred while generating the quiz. Please try again.';
      setError(serverError);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the "Submit Quiz" button click.
   * Sends the quiz data and user answers to the backend for scoring.
   */
  const handleSubmitQuiz = async () => {
    // Check if all questions have been answered
    if (userAnswers.some(answer => answer === null)) {
      setError('Please answer all questions before submitting.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Send both the original quiz and the user's answers for evaluation
      // We re-wrap the quizData in the { questions: [...] } format
      const response = await axios.post(`${API_BASE_URL}/api/evaluate-quiz`, {
        quizData: { questions: quizData }, // Send in the same format the backend expects
        userAnswers,
      });
      
      setResults(response.data); // Store the score and feedback
      setQuizData(null); // Clear the quiz data to show results screen
      
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('An error occurred while submitting the quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Updates the userAnswers state when a radio button is selected.
   * @param {number} questionIndex - The index of the question being answered.
   * @param {number} optionIndex - The index of the option selected.
   */
  const handleAnswerSelect = (questionIndex, optionIndex) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = optionIndex;
    setUserAnswers(newAnswers);
    setError(''); // Clear error when user starts answering
  };

  /**
   * Resets the entire application to its initial state.
   */
  const resetApp = () => {
    setTopic('');
    setQuizData(null);
    setUserAnswers(null);
    setResults(null);
    setError('');
    setIsLoading(false);
  };

  // ===================================================================
  // RENDER FUNCTIONS (Conditional UI)
  // ===================================================================

  /**
   * Renders the initial topic input screen.
   */
  const renderInputScreen = () => (
    <div className="input-container">
      <h1>Smart Quiz Generator</h1>
      <p>Enter any topic to generate a 10-question multiple-choice quiz!</p>
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g., Photosynthesis"
        disabled={isLoading}
      />
      <button onClick={handleGenerateQuiz} disabled={isLoading || !topic.trim()}>
        {isLoading ? 'Generating...' : 'Generate 10-Question Quiz'}
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );

  /**
   * Renders the quiz questions and options.
   */
  const renderQuizScreen = () => (
    <div className="quiz-container">
      <h2>Quiz on: {topic}</h2>
      {quizData.map((question, qIndex) => (
        <div key={qIndex} className="question-card">
          <h3>{qIndex + 1}. {question.question}</h3>
          <div className="options-container">
            {question.options.map((option, oIndex) => (
              <label 
                key={oIndex} 
                className={`option-label ${userAnswers[qIndex] === oIndex ? 'selected' : ''}`} // <-- THIS IS THE CHANGE FOR THE NEW CSS
              >
                <input
                  type="radio"
                  name={`question-${qIndex}`}
                  checked={userAnswers[qIndex] === oIndex}
                  onChange={() => handleAnswerSelect(qIndex, oIndex)}
                  disabled={isLoading}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSubmitQuiz} disabled={isLoading || userAnswers.some(a => a === null)}>
        {isLoading ? 'Submitting...' : 'Submit Quiz'}
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );

  /**
   * Renders the final results screen with score and feedback.
   */
  const renderResultsScreen = () => (
    <div className="results-container">
      <h2>Quiz Results</h2>
      <h3 className="score">Your Score: {results.score} / {results.total}</h3>
      <div className="feedback-list">
        {results.feedback.map((item, index) => (
          <div key={index} className={`feedback-card ${item.isCorrect ? 'correct' : 'incorrect'}`}>
            <h4>{index + 1}. {item.question}</h4>
            <p>Your answer: {item.userAnswer}</p>
            {!item.isCorrect && (
              <p className="correct-answer">Correct answer: {item.correctAnswer}</p>
            )}
            <p className="explanation"><strong>Explanation:</strong> {item.explanation}</p>
          </div>
        ))}
      </div>
      <button onClick={resetApp}>
        Generate Another Quiz
      </button>
    </div>
  );

  // Main render logic for the App component
  return (
    <div className="App">
      <div className="app-container">
        {/* Conditionally render screens based on state */}
        {isLoading && !results && (
          <div className="loading-container">
            <h2>Generating quiz for "{topic}"...</h2>
            <p>(This may take a moment)</p>
          </div>
        )}

        {!isLoading && results && renderResultsScreen()}
        
        {!isLoading && !results && quizData && renderQuizScreen()}
        
        {!isLoading && !results && !quizData && renderInputScreen()}
      </div>
    </div>
  );
}

export default App;

import * as tf from '@tensorflow/tfjs';

// Common expense categories
export const CATEGORIES = [
  'Food & Beverage',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Housing',
  'Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Personal Care',
  'Gifts & Donations',
  'Other'
];

// Training data with multiple examples per category
const TRAINING_DATA = [
  { text: 'starbucks coffee cappuccino latte espresso cafe restaurant mcdonalds burger pizza food dinner lunch breakfast meal', category: 'Food & Beverage' },
  { text: 'uber lyft taxi cab grab gojek bus train subway metro transport commute travel fare ride driver car', category: 'Transportation' },
  { text: 'amazon ebay walmart target store shopping mall purchase buy clothes apparel shoes retail online shop ecommerce', category: 'Shopping' },
  { text: 'netflix hulu movie cinema theater concert disney+ show spotify streaming music theater ticket', category: 'Entertainment' },
  { text: 'rent apartment mortgage lease housing condo property home real estate landlord', category: 'Housing' },
  { text: 'electricity power gas water utility bill internet wifi broadband phone telecom', category: 'Utilities' },
  { text: 'doctor hospital clinic pharmacy medicine prescription health dental medical insurance care', category: 'Healthcare' },
  { text: 'tuition school college university course class textbook books education student campus exam', category: 'Education' },
  { text: 'flight airline hotel airbnb booking vacation holiday trip resort tourism tour', category: 'Travel' },
  { text: 'haircut salon spa gym fitness beauty personal care hygiene cosmetics makeup skincare', category: 'Personal Care' },
  { text: 'donation charity gift present give fundraiser donate contribution nonprofit organization', category: 'Gifts & Donations' },
];

// Create a bag of words model
let model: tf.Sequential | null = null;
const wordIndex: Map<string, number> = new Map();
const categoryIndex: Map<string, number> = new Map();
const reverseCategoryIndex: Map<number, string> = new Map();

// Create the vocabulary from training data
function createVocabulary() {
  const allWords = new Set<string>();
  
  TRAINING_DATA.forEach(item => {
    const words = item.text.split(' ');
    words.forEach(word => allWords.add(word));
  });
  
  // Create word index
  let index = 1; // Start from 1, 0 reserved for unknown words
  allWords.forEach(word => {
    wordIndex.set(word, index++);
  });
  
  // Create category index
  CATEGORIES.forEach((category, idx) => {
    categoryIndex.set(category, idx);
    reverseCategoryIndex.set(idx, category);
  });
}

// Convert text to a feature vector
function textToFeatures(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
  const features = new Array(wordIndex.size + 1).fill(0);
  
  words.forEach(word => {
    const index = wordIndex.get(word) || 0;
    if (index > 0) {
      features[index] = 1; // 1-hot encoding
    }
  });
  
  return features;
}

// Create and train the model
async function trainModel() {
  try {
    if (!wordIndex.size) createVocabulary();
    
    // Create feature vectors and labels
    const xs: number[][] = [];
    const ys: number[] = [];
    
    TRAINING_DATA.forEach(item => {
      const features = textToFeatures(item.text);
      const categoryId = categoryIndex.get(item.category) || 0;
      
      xs.push(features);
      ys.push(categoryId);
    });
    
    // Create and compile model
    model = tf.sequential();
    model.add(tf.layers.dense({
      inputShape: [wordIndex.size + 1],
      units: 128,
      activation: 'relu'
    }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({
      units: CATEGORIES.length,
      activation: 'softmax'
    }));
    
    // Fix: Change loss function to match tensor types
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',  // Changed from sparseCategoricalCrossentropy
      metrics: ['accuracy']
    });
    
    // Fix: Convert labels to one-hot encoding
    const xsTensor = tf.tensor2d(xs);
    const ysTensor = tf.oneHot(tf.tensor1d(ys, 'int32'), CATEGORIES.length);
    
    await model.fit(xsTensor, ysTensor, {
      epochs: 50,
      batchSize: 4,
      shuffle: true,
      verbose: 1
    });
    
    // Clean up tensors
    xsTensor.dispose();
    ysTensor.dispose();
    
    console.log('Model trained successfully');
  } catch (error) {
    console.error('Error training model:', error);
    modelInitialized = false; // Allow retry
  }
}

// Initialize the model
let modelInitialized = false;
async function initModel() {
  if (!modelInitialized) {
    await trainModel();
    modelInitialized = true;
  }
}

// Record user corrections to improve the model
export async function recordUserCorrection(description: string, correctCategory: string) {
  // Store this correction for future training
  // In a real app, you'd save this to your database
  console.log(`Correction recorded: "${description}" should be "${correctCategory}"`);
  
  // Here you could retrain the model with the new data
  // This is just a placeholder for now
}

// Predict category using the trained model
export async function predictCategoryWithModel(description: string): Promise<string> {
  try {
    if (!modelInitialized) {
      await initModel();
    }
    
    if (!model) {
      return predictCategory(description); // Fall back if model fails to load
    }
    
    const features = textToFeatures(description);
    const featuresTensor = tf.tensor2d([features]);
    
    const prediction = model.predict(featuresTensor) as tf.Tensor;
    const categoryId = prediction.argMax(1).dataSync()[0];
    
    featuresTensor.dispose();
    prediction.dispose();
    
    return reverseCategoryIndex.get(categoryId) || 'Other';
  } catch (error) {
    console.error('Error predicting with model:', error);
    return predictCategory(description); // Fall back to rule-based on error
  }
}

// Fast prediction function that falls back to rule-based when needed
export function predictCategory(description: string): string {
  // For now, still use our rule-based approach (as TF.js may not be loaded yet)
  const words = description.toLowerCase().split(/\W+/).filter(w => w.length > 0);
  
  for (const word of words) {
    for (const item of TRAINING_DATA) {
      if (item.text.includes(word)) {
        return item.category;
      }
    }
  }
  
  // Default category if no match found
  return 'Other';
}

// Initialize the model in the background
initModel().catch(console.error); 
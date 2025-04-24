// This is a simplified implementation for Plaid integration
// In a real app, you would need to handle more security and state management

import { PlaidLinkOnSuccessMetadata, PlaidLinkOnExitMetadata } from 'react-plaid-link';

// Store Plaid tokens in localStorage until we implement server storage
const storePlaidToken = (token: string, itemId: string) => {
  localStorage.setItem('plaid_access_token', token);
  localStorage.setItem('plaid_item_id', itemId);
};

const getPlaidToken = () => {
  return {
    accessToken: localStorage.getItem('plaid_access_token') || '',
    itemId: localStorage.getItem('plaid_item_id') || ''
  };
};

// Function to handle successful Plaid Link connection
export const handlePlaidSuccess = async (
  publicToken: string, 
  metadata: PlaidLinkOnSuccessMetadata
) => {
  try {
    // Exchange public token for access token via your API
    const response = await fetch('/api/plaid/exchange-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicToken })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Store tokens for later use
    storePlaidToken(data.accessToken, data.itemId);
    
    return {
      success: true,
      institutionName: metadata.institution?.name || 'Your bank'
    };
  } catch (error) {
    console.error('Plaid token exchange error:', error);
    return { success: false, error };
  }
};

// Function to fetch transactions from Plaid
export const fetchPlaidTransactions = async (
  startDate: string, 
  endDate: string
) => {
  try {
    const { accessToken } = getPlaidToken();
    
    if (!accessToken) {
      throw new Error('No Plaid access token found');
    }
    
    const response = await fetch('/api/plaid/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, startDate, endDate })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.transactions;
  } catch (error) {
    console.error('Plaid transactions error:', error);
    throw error;
  }
}; 
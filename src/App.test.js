import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Pan-Atlantic University header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Pan-Atlantic University/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders file upload section', () => {
  render(<App />);
  const uploadElement = screen.getByText(/File Upload & Processing/i);
  expect(uploadElement).toBeInTheDocument();
});

test('renders how to use button', () => {
  render(<App />);
  const instructionsButton = screen.getByText(/How to Use/i);
  expect(instructionsButton).toBeInTheDocument();
});
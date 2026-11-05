import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
// The look is the game's: the package sheets replace copies the study once kept, in the
// same order after its own font faces.
import './style.css';
import '@starshot/presentation/base.css';
import '@starshot/presentation/entry.css';
import '@starshot/presentation/cloud.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

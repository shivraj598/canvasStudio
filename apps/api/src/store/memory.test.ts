import { describeStoreContract } from './contract.js';
import { createMemoryStore } from './memory.js';

describeStoreContract('memory', (now) => ({ store: createMemoryStore({ now }) }));

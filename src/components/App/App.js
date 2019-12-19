import React from 'react';
import StoreContext from 'storeon/react/context';

import { Cart } from "../Cart/Cart";
import { store } from "../../state";

import './App.css';

export default function App({session, lang}) {
  return (
    <StoreContext.Provider value={ store }>
      <Cart session={ session } lang={ lang } />
    </StoreContext.Provider>
  );
}
// Core
import createStore from 'storeon';

import cart from './cart';
import direction from './direction';
import order from './order';
import product from './product';
import event from './event';
import ticket from './ticket';
import ticketCategory from './ticketCategory';
import user from './user';
import i18n from './i18n';

export const store = createStore(
  [
    cart,
    direction,
    order,
    product,
    event,
    ticket,
    ticketCategory,
    user,
    i18n,
    process.env.NODE_ENV !== 'production' && require('storeon/devtools')
  ]
);

import React, { useEffect, useState, useRef } from 'react';
import useStoreon from 'storeon/react';

import { Product } from '../Product/Product';
import { ProductPreview } from '../ProductPreview/ProductPreview';

import { api } from "../../api";

import './Cart.css';

import format from 'date-fns/format';
import DatePicker, { registerLocale } from 'react-datepicker';
import ru from 'date-fns/locale/ru';
import 'react-datepicker/dist/react-datepicker.css';
import '../Calendar/Calendar.css';
registerLocale('ru-RU', ru);

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
function throttle(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function() {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function() {
    var now = Date.now();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
};

export const Cart = ({session, lang}) => {
  const { dispatch, cart, user, order, ticket, product, i18n } = useStoreon('cart', 'user', 'order', 'ticket', 'product', 'i18n');
  const { fullName, email, phone } = user;
  const [ isShowPromocode, setShowPromocode ] = useState(false);
  const [ sale, setSale ] = useState(0);
  const [ promocode, setPromocode ] = useState('');
  const [ paid, setPaid ] = useState(false);
  const [ emailContent, setEmailContent ] = useState();
  const [ oldId, setOldId ] = useState(0);
  const [ inProcess, setInProcess ] = useState(false);

  const throttled = useRef(throttle(async (oldId, newValue) => {
    if (newValue) {
      const resp = await api.order.promocode(oldId, newValue);
      setSale(resp);
    }
  }, 700));

  const products = () => cart.map(key => {
    const { productId } = order[key];

    return (
      <li className='cart__item cart__item_view_product' key={key}>
        <Product
          cartKey={key}
          productId={productId}
        />
      </li>
    );
  });

  const productsPreview = () => cart.map(key => {
    const { productId } = order[key];

    return (
      <li className='cart__item cart__item_view_product' key={ key }>
        <ProductPreview
          cartKey={key}
          productId={productId}
        />
      </li>
    );
  });

  const setUserData = event => {
    user[event.target.name] = event.target.value;

    dispatch('user/update', user);
  };

  const sum = Object.values(order).reduce((sum, cartItem) => {
    if ( !cartItem.options || !cartItem.options.length ) return 0;

    const {
      productId,
      options: [{
        direction,
        tickets
      }],
    } = cartItem;

    if (!direction || !tickets) return 0;

    Object.keys(tickets).forEach(key => {
      const count = tickets[ key ] || 0;
      const ticketKey = `${productId}.${direction}.${key}`;

      if ( ticket.hasOwnProperty( ticketKey ) ) {
        const { price } = ticket[ ticketKey ];
        const priceSale = Math.ceil( price - ( price * ( sale / 100 ) ) )
        
        sum += count * priceSale;
      }
    } );

    return sum;
  }, 0);

  const checkOut = async e => {
    e.preventDefault();
    setInProcess(true);
    
    await api.cart.updateCart(session, Object.values(order), promocode);
    const createOrder = await api.order.newOrder({ sessionId: session, user });
    
    if (sum !== 0 && sale < 100 && createOrder.payment.Model.Number) {
      const invoiceId = createOrder.payment.Model.Number;
  
      const pay = function () {
        const cp = window.cp;
        const widget = new cp.CloudPayments();
        widget.charge({
          publicId: 'pk_9571506275254507c34463787fa0b',  //id из личного кабинета
          description: 'Оплата на сайте NevaTrip.ru', //назначение
          amount: sum, //сумма
          currency: 'RUB', //валюта
          invoiceId, //номер заказа  (необязательно)
          accountId: user.email, //идентификатор плательщика (необязательно)
          skin: "mini", //дизайн виджета
          // data: {
          //   myProp: 'myProp value' //произвольный набор параметров
          // }
        },
        function (success) { // success
          console.log('success', success);
  
          setPaid(createOrder);
        },
        function (reason, fail) { // fail
          console.log('reason', reason);
          console.log('fail', fail);
  
          alert( 'Оплата не прошла' );
        });
      };
  
      pay();
    } else {
      setPaid(createOrder);
    }
    
    setInProcess(false);
  };
  
  useEffect(() => {
    if (product && order && cart && cart[0] && order[cart[0]]) {
      setOldId( product[order[cart[0]].productId].oldId );

      throttled.current(oldId, promocode)
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promocode, oldId])

  useEffect(() => {
    dispatch('cart/get', session);
    dispatch('i18n/load', lang);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, lang]);
  
  useEffect(() => {
    if (paid.id && paid.hash) {
      setTimeout(async () => {
        const _emailContent = await api.order.getMail( paid.id, paid.hash );
        setEmailContent( _emailContent );
        const sheet = document.createElement('link');
        sheet.rel = 'stylesheet';
        sheet.href = '//api.nevatrip.ru/assets/css/web-desktop.min.css';
        sheet.type = 'text/css';
        document.head.appendChild(sheet);
      }, 1000);
    }
  }, [paid])

  if (paid) return (<div dangerouslySetInnerHTML={{__html: emailContent }}></div>)

  return cart && !cart.loading && !cart.error
    ? <form className='cart' method='post' onSubmit={ checkOut }>
        <ul className='list'>{ products() }</ul>
        <div className='aside'>
          <div className="aside__blank">
            <span className = 'caption caption_l'>{ i18n[ lang ].yourOrder }</span>
            <ul className='listPreview'>{ productsPreview() }</ul>
          </div>
          <div className='asideSeparator'>
            <div className="asideSeparator__line" />
          </div>
          <div className="aside__blank">
            <input type='hidden' name='lang' value={ lang } />
            <div className='cart__user'>
              {
                [
                  { name: 'fullName', type: 'text', value: fullName, label: 'Фамилия и имя' },
                  { name: 'email', type: 'email', value: email, label: 'E-mail' },
                  { name: 'phone', type: 'phone', value: phone, label: 'Телефон' }
                ].map( field => (
                  <div key={ field.name }>
                    <label className='form-label'>
                    <span className='caption'>
                      {field.label}
                    </span>
                      <input
                        className='input'
                        type={ field.type }
                        name={ field.name }
                        defaultValue={ field.value }
                        onBlur={ setUserData }
                        required
                      />
                    </label>
                  </div>
                ))
              }
            </div>
            <div className='cart__promocode'>
              {
                isShowPromocode
                  ? <label className='form-label'>
                  <span className='caption'>
                    Промокод&nbsp;
                    {
                      sale > 0 ? `«${ promocode.toUpperCase() }» на ${ sale }% 👍` : null
                    }
                  </span>
                    <input
                      className='input'
                      name='promocode'
                      defaultValue={promocode}
                      onKeyUp={ e => setPromocode( e.target.value ) }
                      autoComplete='off'
                      autoFocus={isShowPromocode}
                      onBlur={()=> !promocode && setShowPromocode(false)}
                    />
                  </label>
                  : <button className="btn-radio__label" onClick={ () => setShowPromocode(true) }>У меня есть промокод</button>
              }
            </div>
            <span className='checkbox'>
            <input className='checkboxInput' type='checkbox' required='required' id='ofertaCheck'/>
            <label className='caption checkboxCaption' htmlFor='ofertaCheck'>
              Согласен(-на) с&nbsp;
              <a href="https://nevatrip.ru/oferta" target="_blank" rel="noopener noreferrer">условиями покупки</a>
            </label>
          </span>
            <button className='btn btn_block btn_primary' disabled={inProcess}>
              Оплатить { sum } ₽
            </button>
          </div>
        </div>
      </form>
    : <div className='cart'>
        <ul className='list'>
          <li className='cart__item cart__item_view_product'>
            <div className='product product_view_form'>
              <legend className='product__legend' style={{color: 'transparent', textShadow: '0 0 5px rgba(0,0,0,0.5)'}}>
                Ищем подходящий теплоход по рекам и каналам на ближайшую дату…
              </legend>
              <div className='product__inner'>
                <div className='colDesktop'>
                  <label>
                    <span className='caption'>Дата поездки</span>
                    <input
                      readOnly
                      type = 'text'
                      value = { format(new Date(), 'dd MMMM yyyy', { locale: ru }) }
                      className = 'input input_calendar'
                    />
                  </label>
                  <div className='calendarWrapper'>
                    <DatePicker
                      inline
                      calendarClassName='calendar'
                      dateFormat='dd MMMM yyyy'
                      locale='ru-RU'
                      selected={ new Date() }
                    />
                  </div>
                </div>
                <div className='colDesktop'></div>
              </div>
            </div>
          </li>
        </ul>
        <div className='aside'>
          <div className="aside__blank">
            <span className='caption caption_l'>Ваш заказ</span>
          </div>

          <div className='asideSeparator'><div className="asideSeparator__line"></div></div>

          <div className="aside__blank">
            <div className='cart__user'>
              {
                [
                  { name: 'fullName', type: 'text', value: fullName, label: 'Фамилия и имя' },
                  { name: 'email', type: 'email', value: email, label: 'E-mail' },
                  { name: 'phone', type: 'phone', value: phone, label: 'Телефон' }
                ].map( field => (
                  <div key={ field.name }>
                    <label className='form-label'>
                    <span className='caption'>
                      {field.label}
                    </span>
                      <input
                        className='input'
                        type={ field.type }
                        name={ field.name }
                        defaultValue={ field.value }
                        onBlur={ setUserData }
                        required
                      />
                    </label>
                  </div>
                ))
              }
            </div>
            <div className='cart__promocode'>
              {
                isShowPromocode
                  ? <label className='form-label'>
                  <span className='caption'>
                    Промокод&nbsp;
                    {
                      sale > 0 ? `«${ promocode.toUpperCase() }» на ${ sale }% 👍` : null
                    }
                  </span>
                    <input
                      className='input'
                      name='promocode'
                      defaultValue={promocode}
                      onKeyUp={ e => setPromocode( e.target.value ) }
                      autoComplete='off'
                      autoFocus={isShowPromocode}
                      onBlur={()=> !promocode && setShowPromocode(false)}
                    />
                  </label>
                  : <button className="btn-radio__label" onClick={ () => setShowPromocode(true) }>У меня есть промокод</button>
              }
            </div>
            <span className='checkbox'>
            <input className='checkboxInput' type='checkbox' required='required' id='ofertaCheck'/>
            <label className='caption checkboxCaption' htmlFor='ofertaCheck'>
              Согласен(-на) с&nbsp;
              <a href="https://nevatrip.ru/oferta" target="_blank" rel="noopener noreferrer">условиями покупки</a>
            </label>
          </span>
            <button className='btn btn_block btn_primary'>
              Оплатить { sum } ₽
            </button>
          </div>
        </div>
      </div>

};

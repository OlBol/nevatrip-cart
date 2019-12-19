import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ru from 'date-fns/locale/ru';
import useStoreon from 'storeon/react';

import 'react-datepicker/dist/react-datepicker.css';
import './Calendar.css';

const moment = require( 'moment-timezone' );
require( 'moment/locale/ru' );
const tripTimeZone = 'Europe/Moscow';

registerLocale('ru-RU', ru);

const getNearestDate = ( dates = [], date ) => {
  return dates.includes( date ) ? date : dates[ 0 ];
};

const getAvailableDates = ( dates, timeOffset ) => {
  return dates
    .filter( date => moment( moment.tz( date, 0 ).format( "YYYY-MM-DD HH:mm:ss" ) ).toDate() >= timeOffset )
    .sort()
    .map( date => moment( moment.tz( date, 0 ).format( "YYYY-MM-DD HH:mm:ss" ) ).toDate() );
}

export const Calendar = ( { cartKey, productId } ) => {
  const { dispatch, direction, order } = useStoreon( 'direction', 'order' );
  const [ {
    direction: selectedDirection,
    date: selectedDate,
    isOpenTime: selectedIsOpenTime,
  } ] = order[ cartKey ].options;
  const {
    dates = [],
    datesOpenTime = [],
    buyTimeOffset = 0,
  } = direction[ `${ productId }.${ selectedDirection }` ];

  useEffect(() => {
    order[ cartKey ].options[ 0 ].isOpenTime = !dates.length && datesOpenTime.length ? true : selectedIsOpenTime;

    dispatch( 'order/update', order );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [] );

  const timeOffset = moment( moment().utc().tz( tripTimeZone ).format( "YYYY-MM-DD HH:mm:ss" ) ).toDate();
  timeOffset.setMinutes( timeOffset.getMinutes() + buyTimeOffset );

  const [ availableDates, setAvailableDates ] = useState( getAvailableDates( selectedIsOpenTime ? datesOpenTime : dates, timeOffset ) );
  const [ date, setDate ] = useState( getNearestDate( availableDates, selectedDate ) );
  
  useEffect(() => {
    setAvailableDates( getAvailableDates( selectedIsOpenTime ? datesOpenTime : dates, timeOffset ) );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ selectedIsOpenTime ] );
  
  useEffect(() => {
    setDate( getNearestDate( availableDates, date ) );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ availableDates ] );

  useEffect(() => {
    order[ cartKey ].options[ 0 ].date = date;

    dispatch( 'order/update', order );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ date ] );

  return (
    <>
      <label>
        <span className = 'caption'>Дата поездки</span>
        <input
          readOnly
          type='text'
          value={ moment( date ).format( 'LL' ) }
          className='input input_calendar'
        />
      </label>
      <div className='calendarWrapper'>
        <DatePicker
          inline
          calendarClassName='calendar'
          dateFormat='dd MMMM yyyy'
          includeDates={ availableDates }
          locale='ru-RU'
          selected={ date }
          onChange={ date => setDate( date ) }
        />
      </div>
    </>
  );
};

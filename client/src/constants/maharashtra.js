export const DELIVERY_STATE = 'Maharashtra'

export const MAHARASHTRA_CITIES = [
  'Ahmednagar',
  'Akola',
  'Alibag',
  'Amravati',
  'Aurangabad',
  'Beed',
  'Bhandara',
  'Bhiwandi',
  'Buldhana',
  'Chandrapur',
  'Chhatrapati Sambhajinagar',
  'Dhule',
  'Dombivli',
  'Gadchiroli',
  'Gondia',
  'Hingoli',
  'Ichalkaranji',
  'Jalgaon',
  'Jalna',
  'Kalyan',
  'Karad',
  'Kolhapur',
  'Kudal',
  'Latur',
  'Lonavala',
  'Malegaon',
  'Malvan',
  'Mumbai',
  'Nagpur',
  'Nanded',
  'Nandurbar',
  'Nashik',
  'Navi Mumbai',
  'Osmanabad',
  'Palghar',
  'Panvel',
  'Parbhani',
  'Pune',
  'Ratnagiri',
  'Sangli',
  'Satara',
  'Solapur',
  'Thane',
  'Ulhasnagar',
  'Vasai',
  'Virar',
  'Wardha',
  'Washim',
  'Yavatmal'
]

const MAHARASHTRA_PINCODE_RE = /^(40[0-2]\d{3}|41\d{4}|42[0-5]\d{3}|43[0-2]\d{3}|44[0-5]\d{3})$/

export const isMaharashtraPincode = (pincode) =>
  typeof pincode === 'string' && MAHARASHTRA_PINCODE_RE.test(pincode)

export const isMaharashtraCity = (city) => MAHARASHTRA_CITIES.includes(city)

export const validateShippingAddress = ({ city, state, pincode }) => {
  if (state !== DELIVERY_STATE) {
    return { valid: false, message: 'We currently deliver only within Maharashtra' }
  }
  if (!city || !isMaharashtraCity(city)) {
    return { valid: false, message: 'Please select a valid Maharashtra city' }
  }
  if (!pincode || !isMaharashtraPincode(pincode)) {
    return { valid: false, message: 'Please enter a valid Maharashtra pincode' }
  }
  return { valid: true }
}

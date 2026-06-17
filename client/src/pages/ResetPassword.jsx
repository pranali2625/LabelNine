import { Link } from 'react-router-dom'

export default function ResetPassword() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-gray-600 mb-4">Reset your password using your registered email and mobile number.</p>
        <Link to="/forgot-password" className="font-semibold text-black hover:underline">Go to password reset</Link>
      </div>
    </div>
  )
}

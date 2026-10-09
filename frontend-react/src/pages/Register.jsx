import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FileSearch } from 'lucide-react';
import api from '../api/axios';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgType, setOrgType] = useState('university');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password, org_type: orgType });
      setToken(res.data.token);
      navigate('/issuer');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="glass w-full max-w-md space-y-8 p-8 sm:p-10">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/20">
            <FileSearch size={24} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">Create Issuer Account</h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Join Agnitia to issue cryptographically secure documents.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">Organization Name</label>
              <input
                type="text"
                required
                className="input-field mt-1 block w-full"
                placeholder="e.g. Meridian Institute of Technology"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-300">Organization Type</label>
              <select
                className="input-field mt-1 block w-full"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
              >
                <option value="university">University / College</option>
                <option value="school">School / Board</option>
                <option value="government">Government Agency</option>
                <option value="corporate">Corporate / Employer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Email Address (Admin login)</label>
              <input
                type="email"
                required
                className="input-field mt-1 block w-full"
                placeholder="admin@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                required
                className="input-field mt-1 block w-full"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-gold-400 hover:text-gold-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Wordmark } from '../components/GioMark';

export default function NotFound() {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="panel max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
        <Wordmark />
        <h1 className="text-[24px] font-black">The turtle got lost</h1>
        <p className="text-[16px] font-semibold text-ink-2">There's nothing at this address. Let's go back and draw something.</p>
        <Link to="/" className="btn btn-primary btn-lg">
          Start drawing
        </Link>
      </div>
    </div>
  );
}

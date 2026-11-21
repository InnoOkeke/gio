import { Link } from 'react-router-dom';
import { Wordmark } from '../components/GioMark';

export default function NotFound() {
  return (
    <div className="safe-page min-h-full flex items-center justify-center [--page-pad:16px] sm:[--page-pad:24px]">
      <div className="panel max-w-md w-full p-6 sm:p-8 text-center flex flex-col items-center gap-4">
        <Wordmark />
        <h1 className="text-[24px] font-black">The turtle got lost</h1>
        <p className="text-[16px] font-semibold text-ink-2">There's nothing at this address. Let's go back and draw something.</p>
        <Link to="/" className="btn btn-primary btn-lg max-sm:w-full">
          Start drawing
        </Link>
      </div>
    </div>
  );
}

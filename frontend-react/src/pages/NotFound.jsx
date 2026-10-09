import { Link } from 'react-router-dom';
import { FileQuestion, ScanSearch } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import { Button } from '../components/ui/button.jsx';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        body="The link may be mistyped, or the document ID it carried was never issued. Checking a document needs no account — start a verification instead."
        action={
          <Button asChild>
            <Link to="/verify" className="gap-2">
              <ScanSearch size={16} />
              Verify a document
            </Link>
          </Button>
        }
      />
    </div>
  );
}

import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';

export default function ExportDialog({ open, onClose }) {
  return (
    <Modal
      open={open}
      title="Export as PNG is not built yet"
      onClose={onClose}
      footer={
        <Button onClick={onClose}>Got it</Button>
      }
    >
      <p>
        The board is a list of elements rather than an image, so there is nothing to download yet.
        Rendering those elements into a canvas and exporting that canvas as a PNG is one of the open
        contribution issues for Geekstober.
      </p>
      <p>
        The rest of the board keeps working as usual. The problem statement and the acceptance criteria
        for this issue are in the <strong>Geekstober Contribution Opportunities</strong> section of
        the repository README.
      </p>
    </Modal>
  );
}

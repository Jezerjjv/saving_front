export default function Loader({ text = 'Cargando…' }) {
  return (
    <div className="loader-block">
      <div className="loader-spinner" aria-hidden="true" />
      {text && <span className="loader-text">{text}</span>}
    </div>
  );
}

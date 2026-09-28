export default function Avatar({ member, size = 36 }) {
  return (
    <span className="famAvatar" style={{ "--m": member?.color || "#959cab", width: size, height: size, fontSize: size * 0.55 }} aria-hidden="true">
      {member?.emoji || "👤"}
    </span>
  );
}

import { useState } from "react";
import { trpc } from "../utils/trpc";

export default function Withdraw() {
  const [country, setCountry] = useState("CI");
  const [provider, setProvider] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  // Get providers
  const { data } = trpc.instantWithdrawal.getProviders.useQuery({ country });

  const withdrawMutation = trpc.instantWithdrawal.withdraw.useMutation();

  const handleWithdraw = async () => {
    if (!provider || !phone || !amount) {
      alert("Remplis tous les champs");
      return;
    }

    try {
      const res = await withdrawMutation.mutateAsync({
        amount: parseFloat(amount),
        country,
        provider,
        phoneNumber: phone,
      });

      if (res.success) {
        alert("✅ Argent envoyé !");
      } else {
        alert("❌ Erreur: " + res.error);
      }
    } catch (err) {
      alert("Erreur serveur");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>💸 Retirer mon argent</h2>

      {/* Pays */}
      <select value={country} onChange={(e) => setCountry(e.target.value)}>
        <option value="CI">Côte d'Ivoire</option>
        <option value="SN">Sénégal</option>
        <option value="NG">Nigeria</option>
        <option value="GH">Ghana</option>
      </select>

      {/* Provider */}
      <select value={provider} onChange={(e) => setProvider(e.target.value)}>
        <option value="">Choisir opérateur</option>
        {data?.providers.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {/* Numéro */}
      <input
        type="text"
        placeholder="Numéro (ex: 0700000000)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      {/* Montant */}
      <input
        type="number"
        placeholder="Montant ($)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* Bouton */}
      <button onClick={handleWithdraw}>
        Retirer maintenant
      </button>
    </div>
  );
}

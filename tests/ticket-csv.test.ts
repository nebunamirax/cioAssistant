import { describe, expect, it } from "vitest";
import { parseTicketCsv, previewTicketCsv } from "@/lib/services/ticket-csv";

describe("ticket CSV", () => {
  it("lit les exports UTF-8 avec séparateur, guillemets et lignes multiples", () => {
    const csv = parseTicketCsv('\uFEFFID;Titre;Statut;Échéance\r\nINC-1;"Panne; du ""VPN""\r\nau siège";En attente;29/03/2026\r\n');
    const result = previewTicketCsv(csv, { id: 0, title: 1, status: 2, dueDate: 3 }, [{ original: "En attente", status: "BLOCKED" }]);
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({
      externalId: "INC-1",
      title: 'Panne; du "VPN"\r\nau siège',
      originalStatus: "En attente",
      status: "BLOCKED",
      dueDate: new Date("2026-03-29T21:59:59.999Z")
    });
  });

  it("signale les doublons, dates invalides et liens non HTTP", () => {
    const csv = parseTicketCsv("ID,Titre,Échéance,Lien\n001,VPN,2026-11-09,https://example.invalid/001\n001,Doublon,31/02/2026,javascript:alert(1)");
    const result = previewTicketCsv(csv, { id: 0, title: 1, dueDate: 2, url: 3 }, []);
    expect(result.items.map((item) => item.externalId)).toEqual(["001"]);
    expect(result.errors).toEqual([{ line: 3, message: "identifiant dupliqué (001), échéance invalide, lien HTTP ou HTTPS invalide" }]);
  });

  it("refuse un champ tronqué et une association ambiguë", () => {
    expect(() => parseTicketCsv('ID,Titre\nINC-1,"Champ tronqué')).toThrow("non fermé");
    expect(() => previewTicketCsv(parseTicketCsv("ID\tTitre\nINC-1\tVPN"), { id: 0, title: 0 }, [])).toThrow("colonne distincte");
  });
});

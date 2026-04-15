from __future__ import annotations

import unittest

from platform_service import (
    compute_document_hash,
    document_json_to_report_payload,
    report_payload_to_document_json,
)


class ReportDocumentContractTests(unittest.TestCase):
    def test_report_payload_to_document_json_maps_core_sections(self) -> None:
        payload = {
            "report_name": "Founder Board Pack",
            "summary": "This is a concise executive summary.",
            "sections": [
                {"heading": "Market Snapshot", "body": "Market remains strong for this segment."},
                {"heading": "Execution Plan", "body": "Run pilot with five design partners."},
            ],
            "key_findings": ["Demand signal is strong", "CAC needs close tracking"],
            "recommended_actions": ["Launch pilot", "Instrument retention metrics"],
        }

        document = report_payload_to_document_json(payload, report_type="viability", template_id="classic")

        self.assertEqual(document["meta"]["report_name"], "Founder Board Pack")
        self.assertEqual(document["meta"]["report_type"], "viability")
        self.assertEqual(document["meta"]["template_id"], "classic")
        self.assertIsInstance(document["meta"]["page_setup"], dict)
        self.assertEqual(document["meta"]["page_setup"].get("size"), "A4")
        self.assertGreaterEqual(len(document["sections"]), 4)
        section_titles = [section.get("title") for section in document["sections"]]
        self.assertIn("Executive Summary", section_titles)
        self.assertIn("Key Findings", section_titles)
        self.assertIn("Recommended Actions", section_titles)

    def test_document_json_to_report_payload_extracts_cards(self) -> None:
        document = {
            "meta": {"report_name": "Pilot Review", "report_type": "viability", "template_id": "minimal"},
            "sections": [
                {
                    "section_id": "s1",
                    "title": "Executive Summary",
                    "order": 0,
                    "blocks": [
                        {
                            "block_id": "b1",
                            "type": "rich_text",
                            "order": 0,
                            "data": {
                                "type": "doc",
                                "content": [
                                    {
                                        "type": "paragraph",
                                        "content": [{"type": "text", "text": "Pilot cohort feedback is positive."}],
                                    }
                                ],
                            },
                        }
                    ],
                },
                {
                    "section_id": "s2",
                    "title": "Key Findings",
                    "order": 1,
                    "blocks": [
                        {
                            "block_id": "b2",
                            "type": "card",
                            "order": 0,
                            "data": {"title": "Findings", "items": ["Retention is above baseline", "Conversion improved"]},
                        }
                    ],
                },
                {
                    "section_id": "s3",
                    "title": "Recommended Actions",
                    "order": 2,
                    "blocks": [
                        {
                            "block_id": "b3",
                            "type": "card",
                            "order": 0,
                            "data": {"title": "Actions", "items": ["Scale acquisition carefully", "Keep onboarding under 14 days"]},
                        }
                    ],
                },
            ],
        }

        payload = document_json_to_report_payload(document)

        self.assertEqual(payload["report_name"], "Pilot Review")
        self.assertIn("Pilot cohort feedback is positive.", payload["summary"])
        self.assertIn("Retention is above baseline", payload["key_findings"])
        self.assertIn("Keep onboarding under 14 days", payload["recommended_actions"])

    def test_compute_document_hash_is_stable(self) -> None:
        a = {
            "meta": {"report_name": "Stable", "report_type": "viability"},
            "sections": [{"section_id": "s1", "title": "One", "order": 0, "blocks": []}],
        }
        b = {
            "sections": [{"blocks": [], "order": 0, "title": "One", "section_id": "s1"}],
            "meta": {"report_type": "viability", "report_name": "Stable"},
        }

        self.assertEqual(compute_document_hash(a), compute_document_hash(b))


if __name__ == "__main__":
    unittest.main()

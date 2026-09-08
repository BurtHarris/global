import unittest
from pages.patch import replace_literal, replace_section, apply_atomic_edit
from pages.types import Page


class TestPatchEngine(unittest.TestCase):
    def setUp(self):
        self.sample = (
            "# MaxGirls Governance\n\n"
            "## Executive Summary\n"
            "Guidelines with **bold**, [brackets], and $100 currency.\n\n"
            "## Conejita Workstream\n"
            "Initial draft of Conejita guidelines.\n\n"
            "## Review\n"
            "Reviewed by Mayra Bravo.\n"
        )

    def test_replace_literal_special_chars(self):
        target = "Guidelines with **bold**, [brackets], and $100 currency."
        replacement = "Guidelines verified without regex errors."

        success, new_content, idx, err = replace_literal(self.sample, target, replacement)

        self.assertTrue(success)
        self.assertIn("Guidelines verified without regex errors.", new_content)
        self.assertNotIn("[brackets]", new_content)

    def test_replace_section_bounded(self):
        new_conejita = (
            "## Conejita Workstream\n"
            "Fully vetted and updated Conejita guidelines.\n"
        )

        success, new_content, err = replace_section(
            self.sample, "Conejita Workstream", new_conejita
        )

        self.assertTrue(success)
        self.assertIn("Fully vetted and updated Conejita guidelines.", new_content)
        self.assertIn("## Executive Summary", new_content)
        self.assertIn("Reviewed by Mayra Bravo.", new_content)

    def test_atomic_edit_updates_revision(self):
        page = Page(
            id="test-doc",
            title="MaxGirls",
            content=self.sample,
            revision_id="rev-0",
            updated_at="2026-09-07T00:00:00Z",
        )

        res = apply_atomic_edit(
            page,
            kind="literal",
            target="**bold**",
            replacement="**authoritative**",
        )

        self.assertTrue(res.success)
        self.assertIsNotNone(res.page)
        self.assertIn("**authoritative**", res.page.content)
        self.assertNotEqual(res.page.revision_id, "rev-0")


if __name__ == "__main__":
    unittest.main()

import unittest
from pages.convert import convert, commonmark_to_html, html_to_commonmark


class TestConvert(unittest.TestCase):
    def test_roundtrip_html_commonmark(self):
        sample_md = "# MaxGirls\n\nWelcome to **governance**.\n\n> Important block\n"
        html = commonmark_to_html(sample_md)
        self.assertIn("<h1>MaxGirls</h1>", html)
        self.assertIn("<strong>governance</strong>", html)

        reconstructed_md = html_to_commonmark(html)
        self.assertIn("# MaxGirls", reconstructed_md)
        self.assertIn("**governance**", reconstructed_md)

    def test_convert_to_plain_text(self):
        sample_md = "# Title\n\nA paragraph with **bold** text."
        text = convert(sample_md, source="commonmark", target="text")
        self.assertIn("Title", text)
        self.assertIn("bold text", text)
        self.assertNotIn("**", text)
        self.assertNotIn("#", text)


if __name__ == "__main__":
    unittest.main()

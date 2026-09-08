# DRY (Don’t Repeat Yourself)

DRY comes from Andrew Hunt and David Thomas’s *The Pragmatic Programmer*; the publisher describes the 20th Anniversary Edition as a revisit of the book they first wrote in 1999. [(Pearson book page)](https://www.pearson.com/en-us/subject-catalog/p/pragmatic-programmer-the-your-journey-to-mastery-20th-anniversary-edition/P200000000337/9780135956915)

The canonical definition is: “Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.” [(Pragmatic Programmer Tips, Tip 15)](https://pragprog.com/tips/)

The authors later clarify that DRY is not mainly about copy/pasted source text: “DRY is about the duplication of knowledge, of intent.” They define the practical test this way: if one facet must change and you have to update multiple places or formats, you are duplicating knowledge. [(Official DRY excerpt PDF)](https://media.pragprog.com/titles/tpp20/dry.pdf)

A useful consequence is that similar-looking code is not automatically a DRY violation: if two code paths represent different business meanings, they may deserve separate representations even when their structure is alike. DRY asks whether the underlying knowledge is duplicated, not whether tokens happen to match. [(Official DRY excerpt PDF)](https://media.pragprog.com/titles/tpp20/dry.pdf)

The principle also applies beyond code. Hunt and Thomas explicitly say: “Treat English as Just Another Programming Language. Write documents as you would write code: honor the DRY principle...” [(Pragmatic Programmer Tips, Tip 11)](https://pragprog.com/tips/)

## Concise takeaway

Use DRY to centralize rules, decisions, schemas, and other knowledge so each fact has one authoritative home. Do not use DRY as a reason to merge code merely because it looks similar; the deciding question is whether the same knowledge would otherwise need synchronized changes in more than one place. [(Pragmatic Programmer Tips)](https://pragprog.com/tips/) [(Official DRY excerpt PDF)](https://media.pragprog.com/titles/tpp20/dry.pdf)

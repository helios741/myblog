
class Document():
    WELCOME_STR = "Welcome {}"
    def __init__(self, title, author, context):
        print("Document __init__ call")
        self.title = title
        self.author = author
        self.__context = context

    @classmethod
    def create_empty_book(cls, title, author):
        return cls(title=title, author=author, context='nothing')
    def get_context_length(self):
        return len(self.__context)
    @staticmethod
    def get_welcome(context):
        return Document.WELCOME_STR.format(context)




print(Document.WELCOME_STR)
print(Document.get_welcome("helios"))
empty_book = Document.create_empty_book("TITLE", "Author")
print(empty_book.get_context_length())
print(empty_book.get_welcome('indeed nothing'))

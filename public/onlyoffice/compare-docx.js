builderJS.OpenFile(Argument.currentUrl);

const previous = builderJS.OpenTmpFile(Argument.previousUrl);
Api.CompareDocuments(previous);
previous.Close();

builderJS.SaveFile('docx', 'WOLKO-Comparison.docx');
builderJS.CloseFile();

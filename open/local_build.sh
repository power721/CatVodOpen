
node build.js && \
mkdir -p Payload/Runner.app/Frameworks/App.framework/flutter_assets/asset/js/ && \
rm -rf Payload/Runner.app/Frameworks/App.framework/flutter_assets/asset/js/* && \
cp -r dist/* Payload/Runner.app/Frameworks/App.framework/flutter_assets/asset/js/ && \
zip -ur /home/harold/Downloads/cat.ipa Payload/Runner.app/Frameworks/App.framework/flutter_assets/asset/js/ && \
rm -f cat_open.zip && \
echo "cat.ipa updated"

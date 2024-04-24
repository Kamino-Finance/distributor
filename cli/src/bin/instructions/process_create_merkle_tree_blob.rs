use crate::*;

pub fn process_create_merkle_tree_blob(merkle_tree_blob_args: &CreateMerkleTreeBlobArgs) -> Result<()> {

    let paths: Vec<_> = fs::read_dir(&merkle_tree_blob_args.json_path)
        .unwrap()
        .map(|r| r.unwrap())
        .collect();

    // create merkle tree folder if not existed
    fs::create_dir_all(merkle_tree_blob_args.merkle_tree_path.clone()).unwrap();

    for file in paths {
        let single_tree_path = file.path();
        let (fname, single_tree) = match single_tree_path.extension() {
            Some(ext) => {
                if ext == "bin" {
                    continue;
                } else {
                    let fname = single_tree_path.file_stem().unwrap().to_str().unwrap();
                    (fname, AirdropMerkleTree::new_from_file(&single_tree_path)?)
                }
            }
            None => continue,
        };
        let base_path_clone = merkle_tree_blob_args.merkle_tree_path.clone();
        let path = base_path_clone
            .as_path()
            .join(format!("{fname}.bin"));
        single_tree.write_blob_to_file(&path)?;
        println!("Wrote blob to {path:?}");
    }

    Ok(())
}
